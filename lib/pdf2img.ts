export interface PdfConversionResult {
  imageUrl: string;
  file: File | null;
  error?: string;
}

let pdfjsLib: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;
  if (loadPromise) return loadPromise;

  isLoading = true;
  try {
    // @ts-expect-error - pdfjs-dist/build/pdf.mjs is not a module
    loadPromise = import("pdfjs-dist/build/pdf.mjs").then((lib) => {
      // Try local worker first, fallback to CDN if needed
      try {
        lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      } catch (workerError) {
        console.warn("Local worker failed, using CDN fallback:", workerError);
        lib.GlobalWorkerOptions.workerSrc =
          "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.54/build/pdf.worker.min.mjs";
      }
      pdfjsLib = lib;
      isLoading = false;
      return lib;
    });

    return loadPromise;
  } catch (error) {
    isLoading = false;
    loadPromise = null;
    throw new Error(`Failed to load PDF.js: ${error}`);
  }
}

export async function convertPdfToImage(
  file: File
): Promise<PdfConversionResult> {
  try {
    // Check if file is actually a PDF
    if (
      !file.type.includes("pdf") &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return {
        imageUrl: "",
        file: null,
        error: "File is not a PDF",
      };
    }

    // Check if file is empty
    if (file.size === 0) {
      return {
        imageUrl: "",
        file: null,
        error: "File is empty",
      };
    }

    const lib = await loadPdfJs();

    // Clear any existing worker to force reload
    if (lib.GlobalWorkerOptions.workerSrc) {
      lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    }

    const arrayBuffer = await file.arrayBuffer();

    // Try to load the PDF with better error handling
    let pdf;
    try {
      pdf = await lib.getDocument({ data: arrayBuffer }).promise;
    } catch (pdfError) {
      console.error("PDF loading error:", pdfError);
      return {
        imageUrl: "",
        file: null,
        error: `Failed to load PDF: ${pdfError}`,
      };
    }

    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 4 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      return {
        imageUrl: "",
        file: null,
        error: "Failed to get canvas context",
      };
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    await page.render({ canvasContext: context, viewport }).promise;

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // Create a File from the blob with the same name as the pdf
            const originalName = file.name.replace(/\.pdf$/i, "");
            const imageFile = new File([blob], `${originalName}.png`, {
              type: "image/png",
            });

            resolve({
              imageUrl: URL.createObjectURL(blob),
              file: imageFile,
            });
          } else {
            resolve({
              imageUrl: "",
              file: null,
              error: "Failed to create image blob",
            });
          }
        },
        "image/png",
        1.0
      ); // Set quality to maximum (1.0)
    });
  } catch (err) {
    console.error("PDF conversion error:", err);
    return {
      imageUrl: "",
      file: null,
      error: `Failed to convert PDF: ${err}`,
    };
  }
}
