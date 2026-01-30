import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getSelf } from "@/lib/auth-service";
import { db } from "@/lib/db";

const f = createUploadthing();

export const ourFileRouter = {
  thumbnailUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const self = await getSelf();
      
      if (!self) {
        throw new Error("Unauthorized");
      }
      
      return { user: self };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;