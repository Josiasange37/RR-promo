# Cloudinary image delivery

1. Create a Cloudinary product environment and copy its **cloud name**.
2. Upload the hero image to the Media Library using public ID `nb-dance/hero` (or choose your own ID).
3. Copy `.env.local.example` to `.env.local` and enter the cloud name and public ID.
4. In Vercel, add the same two `NEXT_PUBLIC_` variables, then redeploy.

The application requests a 1800px hero image using `c_fill,g_auto`, `dpr_auto`, `q_auto`, and `f_auto`. Cloudinary crops on its servers, selects a modern browser-supported format, caches the resulting asset at its CDN edge, and serves the right pixel density.

Do not expose `CLOUDINARY_API_SECRET` in browser code. This static site does not need it: upload assets from the Cloudinary Media Library. If automated uploads are needed later, add a server-side signed-upload endpoint.
