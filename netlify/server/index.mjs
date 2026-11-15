// Netlify Server entry point.
// The existing Express application owns authentication, API routes and admin pages.
// Netlify serves built static assets from dist and forwards dynamic requests here.
import "../../server.js";
