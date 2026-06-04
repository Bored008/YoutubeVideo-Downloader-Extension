/* global chrome */
import { useEffect, useState } from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

function App() {

  const [videoUrl, setVideoUrl] = useState("");
  const [quality, setQuality] = useState("720");
  const [maxHeight, setMaxHeight] = useState(null);

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [videoDuration, setVideoDuration] = useState(0);
  const [sliderRange, setSliderRange] = useState([0, 0]);

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const formatSecondsToTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const parseTimeToSeconds = (t) => {
    if (typeof t === "number") return t;
    if (!t) return 0;
    if (String(t).includes(":")) {
      const parts = String(t).split(":").map(Number).reverse();
      let secs = 0;
      if (parts[0]) secs += parts[0];
      if (parts[1]) secs += parts[1] * 60;
      if (parts[2]) secs += parts[2] * 3600;
      return secs;
    }
    return Number(t);
  };

  useEffect(() => {
    if (
      typeof chrome !== "undefined" &&
      chrome.tabs
    ) {
      chrome.tabs.query(
        { active: true, currentWindow: true },
        (tabs) => {
          const currentUrl = tabs[0]?.url;
          if (currentUrl && currentUrl.includes("youtube.com/watch")) {
            setVideoUrl(currentUrl);
          }
        }
      );
    }
  }, []);

  useEffect(() => {
    if (videoUrl && videoUrl.includes("youtube.com/watch")) {
      const fetchInfo = async () => {
        setIsScanning(true);
        try {
          const res = await fetch("https://youtubevideo-downloader-extension.onrender.com/video-info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: videoUrl })
          });
          const data = await res.json();
          if (data.success) {
            if (data.maxHeight) {
              setMaxHeight(data.maxHeight);
              setQuality(prevQuality => {
                 const q = parseInt(prevQuality);
                 if (q > data.maxHeight) {
                   if (data.maxHeight >= 1080) return "1080";
                   if (data.maxHeight >= 720) return "720";
                   return "480";
                 }
                 return prevQuality;
              });
            }
            if (data.duration) {
              setVideoDuration(data.duration);
              setSliderRange([0, data.duration]);
              setStartTime(formatSecondsToTime(0));
              setEndTime(formatSecondsToTime(data.duration));
            }
          }
        } catch(e) {
          console.error(e);
        } finally {
          setIsScanning(false);
        }
      }
      fetchInfo();
    } else {
      setMaxHeight(null);
      setVideoDuration(0);
      setSliderRange([0, 0]);
      setIsScanning(false);
    }
  }, [videoUrl]);

  const handleSliderChange = (newRange) => {
    setSliderRange(newRange);
    setStartTime(formatSecondsToTime(newRange[0]));
    setEndTime(formatSecondsToTime(newRange[1]));
  };

  const handleStartTimeChange = (e) => {
    const val = e.target.value;
    setStartTime(val);
    const sec = parseTimeToSeconds(val);
    if (!isNaN(sec) && sec >= 0 && sec <= videoDuration && sec <= sliderRange[1]) {
      setSliderRange([sec, sliderRange[1]]);
    }
  };

  const handleEndTimeChange = (e) => {
    const val = e.target.value;
    setEndTime(val);
    const sec = parseTimeToSeconds(val);
    if (!isNaN(sec) && sec >= sliderRange[0] && sec <= videoDuration) {
      setSliderRange([sliderRange[0], sec]);
    }
  };

  const handleDownload = async () => {
    if(!videoUrl){
      setStatus("please enter video URL");
      return;
    }
    try {
      setLoading(true);
      setStatus("Downloading...");

      const response = await fetch(
        "https://youtubevideo-downloader-extension.onrender.com/download",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: videoUrl,
            quality,
            startTime,
            endTime,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setStatus("Download completed! Prompting to save...");
        if (data.fileName) {
          const downloadUrl = `https://youtubevideo-downloader-extension.onrender.com/downloads/${data.fileName}`;
          if (typeof chrome !== "undefined" && chrome.downloads) {
            chrome.downloads.download({ url: downloadUrl, saveAs: true });
          } else {
            window.open(downloadUrl, "_blank");
          }
        } else {
          console.log("Downloaded File:", data.file);
        }
      }
      else {
        setStatus("Download failed");
      }
    }
    catch (error) {
      console.log(error);
      setStatus("Something went wrong");
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-[350px] min-h-[500px] bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold text-center mb-5">
        YouTube Downloader
      </h1>

      <input
        type="text"
        placeholder="Paste YouTube URL"
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
        className="
          w-full
          p-3
          rounded-lg
          bg-gray-800
          mb-3
          outline-none
        "
      />

      {isScanning && (
        <p className="text-sm text-yellow-400 mb-3 text-center">
          Scanning available qualities and length...
        </p>
      )}

      <select
        value={quality}
        onChange={(e) => setQuality(e.target.value)}
        className="
          w-full
          p-3
          rounded-lg
          bg-gray-800
          mb-4
          outline-none
        "
      >
        {(!maxHeight || maxHeight >= 2160) && <option value="2160">4K</option>}
        {(!maxHeight || maxHeight >= 1440) && <option value="1440">2K</option>}
        {(!maxHeight || maxHeight >= 1080) && <option value="1080">1080p</option>}
        {(!maxHeight || maxHeight >= 720) && <option value="720">720p</option>}
        <option value="480">480p</option>
      </select>

      {videoDuration > 0 && (
        <div className="mb-4 px-2">
          <p className="text-sm text-gray-300 mb-2 font-medium">Select Trim Range:</p>
          <Slider
            range
            min={0}
            max={videoDuration}
            value={sliderRange}
            onChange={handleSliderChange}
            styles={{
              track: { backgroundColor: '#3b82f6' },
              handle: { borderColor: '#3b82f6', backgroundColor: '#fff' }
            }}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>00:00:00</span>
            <span>{formatSecondsToTime(videoDuration)}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Start (00:00:00)"
          value={startTime}
          onChange={handleStartTimeChange}
          className="
            w-1/2
            p-3
            rounded-lg
            bg-gray-800
            outline-none
          "
        />
        <input
          type="text"
          placeholder="End (00:00:20)"
          value={endTime}
          onChange={handleEndTimeChange}
          className="
            w-1/2
            p-3
            rounded-lg
            bg-gray-800
            outline-none
          "
        />
      </div>

      <button
        disabled={loading}
        onClick={handleDownload}
        className="
          w-full
          bg-blue-600
          hover:bg-blue-700
          transition
          p-3
          rounded-lg
          font-semibold
          mb-4
        "
      >
        {loading ? "Downloading..." : "Download"}
      </button>

      <p className="text-center text-sm">
        {status}
      </p>
    </div>
  );
}

export default App;
