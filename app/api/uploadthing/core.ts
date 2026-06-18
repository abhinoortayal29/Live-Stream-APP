import { createUploadthing, type FileRouter } from "uploadthing/next";
export const runtime = "nodejs";
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

      // ✅ Pass userId to onUploadComplete via metadata
      return { userId: self.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // ✅ DB save now happens SERVER-SIDE — guaranteed even if frontend crashes
      await db.stream.update({
        where: { userId: metadata.userId },
        data: { thumbnailUrl: file.url },
      });

      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;