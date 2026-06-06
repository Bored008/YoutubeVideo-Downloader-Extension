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
          if (currentUrl && (currentUrl.includes("youtube.com") || currentUrl.includes("youtu.be"))) {
            setVideoUrl(currentUrl);
          }
        }
      );
    }
  }, []);

  useEffect(() => {
    if (videoUrl && (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be"))) {
      const fetchInfo = async () => {
        setIsScanning(true);
        try {
          const res = await fetch("http://localhost:5000/video-info", {
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
        "http://localhost:5000/download",
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
          const downloadUrl = `http://localhost:5000/downloads/${data.fileName}`;
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
    <div className="w-[350px] min-h-[500px] animated-gradient-bg text-white p-5 flex flex-col relative overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-50px] left-[-50px] w-32 h-32 bg-indigo-500/30 rounded-full blur-[40px] pointer-events-none"></div>
      <div className="absolute bottom-[-50px] right-[-50px] w-40 h-40 bg-cyan-500/20 rounded-full blur-[50px] pointer-events-none"></div>

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="flex items-center justify-center gap-2 mb-6">
          <svg className="w-8 h-8 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path>
            <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor"></polygon>
          </svg>
          <h1 className="text-2xl font-bold text-gradient">YT Downloader</h1>
        </div>

        <div className="glass-panel rounded-2xl p-4 mb-4">
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
            </div>
            <input
              type="text"
              placeholder="Paste YouTube URL"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full pl-9 pr-3 py-3 glass-input text-sm"
            />
          </div>

          {isScanning && (
            <div className="flex items-center justify-center gap-2 mb-4 text-xs text-indigo-300 animate-pulse">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75"></path></svg>
              Scanning video details...
            </div>
          )}

          <div className="relative">
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full p-3 pl-4 pr-8 glass-input appearance-none text-sm cursor-pointer"
            >
              {(!maxHeight || maxHeight >= 2160) && <option value="2160" className="bg-slate-900 text-white">4K (2160p)</option>}
              {(!maxHeight || maxHeight >= 1440) && <option value="1440" className="bg-slate-900 text-white">2K (1440p)</option>}
              {(!maxHeight || maxHeight >= 1080) && <option value="1080" className="bg-slate-900 text-white">HD (1080p)</option>}
              {(!maxHeight || maxHeight >= 720) && <option value="720" className="bg-slate-900 text-white">HD (720p)</option>}
              <option value="480" className="bg-slate-900 text-white">SD (480p)</option>
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {videoDuration > 0 && (
          <div className="glass-panel rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <p className="text-xs text-gray-300 font-medium">Trim Range</p>
            </div>
            
            <div className="px-2 mb-4">
              <Slider
                range
                min={0}
                max={videoDuration}
                value={sliderRange}
                onChange={handleSliderChange}
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-2 font-mono">
                <span>00:00:00</span>
                <span>{formatSecondsToTime(videoDuration)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 mb-1 block pl-1">Start Time</label>
                <input
                  type="text"
                  value={startTime}
                  onChange={handleStartTimeChange}
                  className="w-full p-2 glass-input text-xs font-mono text-center"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 mb-1 block pl-1">End Time</label>
                <input
                  type="text"
                  value={endTime}
                  onChange={handleEndTimeChange}
                  className="w-full p-2 glass-input text-xs font-mono text-center"
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-auto pt-2">
          <button
            disabled={loading}
            onClick={handleDownload}
            className={`
              w-full p-3 rounded-xl font-semibold text-white
              transition-all duration-300 flex items-center justify-center gap-2
              ${loading 
                ? 'bg-slate-700 cursor-not-allowed opacity-70' 
                : 'bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] active:scale-[0.98]'
              }
            `}
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75"></path></svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                Download Video
              </>
            )}
          </button>
          
          <div className="h-6 mt-3 flex items-center justify-center">
            {status && (
              <p className="text-xs text-center text-indigo-200 animate-pulse bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                {status}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
