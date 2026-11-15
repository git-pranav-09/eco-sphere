import app from "../../server.js";

// Netlify Server runs the existing Express application as the site's server.
const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => {
  console.log("Echo Sphere listening on", port);
});
