import {db} from "@/lib/db";
export const getStreamByUserId = async (userId: string) => {
      let stream = await db.stream.findUnique({
        where: { userId },
      });
    
      
      return stream;
    };
    