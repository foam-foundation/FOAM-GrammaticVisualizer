# FOAM starter

Try [FOAM3](https://github.com/foam-foundation/foam3) without cloning or building it.
One framework file, one page, one app file you edit.

```
cd ..    # the demo/ folder
python3 -m http.server 8000
```

Open http://127.0.0.1:8000/starter/ then edit `app.js` and reload. Details in `how-to.html`.

`../foam-bin-3.js` (shared with the diagram pages in the folder above) is built from FOAM3 (Apache License 2.0, per-file headers are inside the bin).
Rebuild it from this folder with `FOAM3=/path/to/foam3 node tools/build-bin.mjs`; it writes to the folder above.
