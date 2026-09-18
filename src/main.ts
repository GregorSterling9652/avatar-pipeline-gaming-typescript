import { buildAvatar } from "./avatar_pipeline.js";

const result = await buildAvatar({
  playerId: "player-42",
  filename: "avatar.png",
  file: process.env.AVATAR_FILE ?? "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  aspect: "1:1"
});
console.log(JSON.stringify(result, null, 2));
