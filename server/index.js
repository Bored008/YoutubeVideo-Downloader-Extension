process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:");
  console.error(err);
  // Don't exit, keep server running
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:");
  console.error(err);
  // Don't exit, keep server running
});

const express = require("express");
const cors = require("cors");
const ytDlp = require("yt-dlp-exec")
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
ffmpeg.setFfmpegPath(ffmpegPath);
const fs = require("fs");

const app = express();

// Ensure downloads directory exists
const downloadsDir = path.join(__dirname, "downloads");
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
  console.log("Created downloads directory:", downloadsDir);
}

app.use(cors());
app.use(express.json());
app.use("/downloads", express.static(path.join(__dirname, "downloads")));

app.get("/", (req, res) => {
  res.send("Backend in running ...");
});

//download api
app.post("/download", async (req, res) => {
  try {
    console.log("=================================");
console.log("New download request received");
console.log(req.body);
    const {
  url,
  quality,
  startTime,
  endTime
} = req.body;
    const downloadsDir = path.join(__dirname, "downloads");
    const trimmedPath = path.join(downloadsDir, `trimmed-${Date.now()}.mp4`);
    let finalVideoPath = "";

    let format = "best";

    if(quality === "2160"){
      format = "bestvideo[height<=2160]+bestaudio/best"
    }
    else if(quality === "1440"){
      format = "bestvideo[height<=1440]+bestaudio/best"
    }
    else if(quality === "1080"){
      format = "bestvideo[height<=1080]+bestaudio/best"
    }
    else if(quality === "720"){
      format = "bestvideo[height<=720]+bestaudio/best"
    }
    else if(quality === "480"){
      format = "bestvideo[height<=480]+bestaudio/best"
    }

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

    const uniqueId = Date.now();
    const tempTemplate = path.join(downloadsDir, `temp-${uniqueId}.%(ext)s`);

    let ytDlpOptions = {
      output: tempTemplate,
      format: format,
      mergeOutputFormat: "mp4",
      ffmpegLocation: ffmpegPath,
    };

    if (startTime && endTime) {
      const startSec = parseTimeToSeconds(startTime);
      const endSec = parseTimeToSeconds(endTime);
      const duration = endSec - startSec;
      if (duration <= 0) throw new Error("Invalid start/end times for trimming");
      ytDlpOptions.downloadSections = `*${startSec}-${endSec}`;
    }

    console.log(`Starting yt-dlp download for ${uniqueId}...`);

    await ytDlp(url, ytDlpOptions);

    console.log(`yt-dlp download ${uniqueId} completed`);

    // locate the actual downloaded temp file (yt-dlp replaces %(ext)s)
    let tempFile;
    try {
      const downloadedFiles = fs.readdirSync(downloadsDir);
      const tempFiles = downloadedFiles.filter((f) => f.startsWith(`temp-${uniqueId}.`));
      if (tempFiles.length === 0) throw new Error("Downloaded temp file not found");
      // Use the most recently created temp file
      tempFile = tempFiles.sort().pop();
    } catch (err) {
      throw new Error("Failed to find temp file: " + err.message);
    }
    const tempPath = path.join(downloadsDir, tempFile);

    const finalPath = path.join(
      downloadsDir,
      `video-${uniqueId}.mp4`
    );

    fs.renameSync(tempPath, finalPath);

    finalVideoPath = finalPath;

if (!fs.existsSync(finalVideoPath)) {
  throw new Error("Final video file not found");
}

    const fileName = path.basename(finalVideoPath);

    res.json({
      success: true,
      file: finalVideoPath,
      fileName: fileName
    });
  } catch (error) {
    console.error("Download error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Download failed",
        details: error.message,
      });
    }
  }
});

app.post("/video-info", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }
    
    console.log("Fetching video info for:", url);
    const info = await ytDlp(url, { dumpJson: true, noWarnings: true });
    
    const formats = info.formats || [];
    const heights = formats.map(f => f.height).filter(h => h != null);
    const maxHeight = heights.length > 0 ? Math.max(...heights) : 0;
    const duration = info.duration || 0;
    
    console.log("Max height found:", maxHeight, "Duration:", duration);
    res.json({ success: true, maxHeight, duration });
  } catch (error) {
    console.error("Video info error:", error.message);
    res.status(500).json({ error: "Failed to fetch video info" });
  }
});

app.listen(5000, () => {
  console.log("server running on port 5000");
});
