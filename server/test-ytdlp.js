const ytDlp = require("yt-dlp-exec");
const url = "https://www.youtube.com/watch?v=jNQXAC9IVRw"; // Me at the zoo

ytDlp(url, {
  dumpJson: true,
  noWarnings: true
}).then(output => {
  // output is an object
  const formats = output.formats || [];
  const heights = formats.map(f => f.height).filter(h => h != null);
  const maxHeight = Math.max(...heights);
  console.log("Max height:", maxHeight);
  console.log("Available heights:", [...new Set(heights)].sort((a,b)=>b-a));
}).catch(err => {
  console.error("ERROR", err);
});
