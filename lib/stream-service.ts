import {db} from "@/lib/db";
export const getStreamByUserId = async (userId: string) => {
      let stream = await db.stream.findUnique({
        where: { userId },
      });
    
      if (!stream) {
        stream = await db.stream.create({
          data: {
            userId,
            name: "My Stream",
            isChatEnabled: true,
            isChatDelayed: false,
            isChatFollowersOnly: false,
          },
        });
      }
    
      return stream;
    };
    