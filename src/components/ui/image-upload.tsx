import { useState, useRef } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  folder: string; // e.g. "parts" or "bikes"
  maxImages?: number;
}

const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
const QUALITY = 0.7;

/**
 * Compresses an image file client-side using canvas.
 * Converts to WebP, resizes to max 800px, quality 0.7.
 * Returns a Blob ready for upload.
 */
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Scale down proportionally
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Falha ao comprimir imagem"));
        },
        "image/webp",
        QUALITY
      );
    };
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = URL.createObjectURL(file);
  });
}

export function ImageUpload({ images, onChange, folder, maxImages = 2 }: ImageUploadProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remaining = maxImages - images.length;
    if (remaining <= 0) {
      toast({ title: `Máximo de ${maxImages} imagens`, variant: "destructive" });
      return;
    }

    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);

    try {
      const newUrls: string[] = [];

      for (const file of toUpload) {
        // Validate type
        if (!file.type.startsWith("image/")) {
          toast({ title: "Arquivo inválido, envie uma imagem", variant: "destructive" });
          continue;
        }

        // Compress
        const compressed = await compressImage(file);
        const fileName = `${folder}/${crypto.randomUUID()}.webp`;

        // Upload
        const { error } = await supabase.storage
          .from("product-images")
          .upload(fileName, compressed, {
            contentType: "image/webp",
            upsert: false,
          });

        if (error) throw error;

        // Get public URL
        const { data } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        newUrls.push(data.publicUrl);
      }

      onChange([...images, ...newUrls]);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao enviar imagem", variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeImage = async (url: string) => {
    // Extract path from URL
    const match = url.match(/product-images\/(.+)$/);
    if (match) {
      await supabase.storage.from("product-images").remove([match[1]]);
    }
    onChange(images.filter((u) => u !== url));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {images.map((url) => (
          <div
            key={url}
            className="relative h-20 w-20 rounded-md border border-border overflow-hidden bg-muted/20 group"
          >
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(url)}
              className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3 text-destructive" />
            </button>
          </div>
        ))}

        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="h-20 w-20 rounded-md border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ImagePlus className="h-5 w-5" />
                <span className="text-[9px] mt-0.5">Imagem</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <p className="text-[10px] text-muted-foreground">
        Até {maxImages} imagens • JPG, PNG ou WebP • Otimizadas automaticamente
      </p>
    </div>
  );
}
