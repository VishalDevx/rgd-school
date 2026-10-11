import { z } from "zod";
import { Gender } from "@/lib/enums";

export const StudentCreateSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  admissionNo: z.string(),
  rollNumber: z.string(),
  dob: z.string().optional(),
  gender: z.nativeEnum(Gender).optional(),
  address: z.string().optional(),
  classId: z.string().optional(),
  profileImg: z.string().optional(),
  adharNo: z.string().optional(),
});


