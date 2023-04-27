import * as pdfjs from "pdfjs-dist";
import { PDFDocument } from "pdf-lib";
import { fileTypeFromBuffer } from "file-type";

(async () => {
  pdfjs.GlobalWorkerOptions.workerSrc = await import(
    "pdfjs-dist/build/pdf.worker.entry"
  );
})();

export type Image = {
  name: string
  src: string
}

export interface Extractor {
  extract(pdf: Uint8Array): Promise<Image[]>
}

const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d')

export class JpegExtractor implements Extractor {

  async extract(pdf: Uint8Array): Promise<Image[]> {
    const res: Image[] = []
    const doc = await PDFDocument.load(pdf)
    const objects = doc.context.enumerateIndirectObjects()

    for (let [ref, obj] of objects) {
      if (!obj.hasOwnProperty("contents")) continue

      const u8 = obj["contents"];
      const type = await fileTypeFromBuffer(u8);

      if (!type) continue

      if (type.ext == "jpg") {
        console.log(type.ext)
        res.push({
          name: `Object#${ref.tag}.jpg`,
          src: URL.createObjectURL(new Blob([u8.buffer], { type: "image/jpg" }))
        })
      }
    }

    console.log(res)

    return res
  }
}

export class VisiblePageExtractor implements Extractor {
  async extract(pdf: Uint8Array): Promise<Image[]> {
    const res: Image[] = []
    const doc = await pdfjs.getDocument(pdf).promise

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const viewport = page.getViewport({ scale: 1.0 })
      canvas.height = viewport.height
      canvas.width = viewport.width
      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };


      await page.render(renderContext).promise

      trimCanvas(ctx)
      res.push({
        name: `Object#${i}.jpg`,
        src: canvas.toDataURL('image/jpeg', 1.0)
      })
    }

    return res
  }
}

// ctx is the 2d context of the canvas to be trimmed
// This function will return false if the canvas contains no or no non transparent or non whitespace pixels.
// Returns true if the canvas contains non transparent or non whitespace pixels
function trimCanvas(ctx): [number, number] { // removes transparent edges
  var x, y, w, h, top, left, right, bottom, data, idx1, idx2, found, imgData;
  w = ctx.canvas.width;
  h = ctx.canvas.height;
  if (!w && !h) { return [0, 0] }
  imgData = ctx.getImageData(0, 0, w, h);
  data = new Uint32Array(imgData.data.buffer);
  idx1 = 0;
  idx2 = w * h - 1;
  found = false;
  const whitespace = 4294967295

  // search from top and bottom to find first rows containing a non transparent pixel.
  for (y = 0; y < h && !found; y += 1) {
    for (x = 0; x < w; x += 1) {
      if (data[idx1++] && data[idx1] != whitespace && !top) {
        top = y + 1;
        if (bottom) { // top and bottom found then stop the search
          found = true;
          break;
        }
      }
      if (data[idx2--] && data[idx2] != whitespace && !bottom) {
        bottom = h - y - 1;
        if (top) { // top and bottom found then stop the search
          found = true;
          break;
        }
      }
    }
    if (y > h - y && !top && !bottom) { return [w, h] } // image is completely blank so do nothing
  }
  top -= 1; // correct top 
  found = false;
  // search from left and right to find first column containing a non transparent pixel.
  for (x = 0; x < w && !found; x += 1) {
    idx1 = top * w + x;
    idx2 = top * w + (w - x - 1);
    for (y = top; y <= bottom; y += 1) {
      if (data[idx1] && data[idx1] != whitespace && !left) {
        left = x + 1;
        if (right) { // if left and right found then stop the search
          found = true;
          break;
        }
      }
      if (data[idx2] && data[idx2] != whitespace && !right) {
        right = w - x - 1;
        if (left) { // if left and right found then stop the search
          found = true;
          break;
        }
      }
      idx1 += w;
      idx2 += w;
    }
  }
  left -= 1; // correct left
  if (w === right - left + 1 && h === bottom - top + 1) { return [w, h] } // no need to crop if no change in size
  w = right - left + 1;
  h = bottom - top + 1;
  ctx.canvas.width = w;
  ctx.canvas.height = h;
  ctx.putImageData(imgData, -left, -top);
  return [w, h];
}
