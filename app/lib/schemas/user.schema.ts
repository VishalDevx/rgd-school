import { z } from "zod";
import { Role, Gender } from "@/lib/enums";

export const UserCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(Role),
  phone: z.string().optional(),
  adharNo: z.string().optional(),
  image: z.string().url().optional(),
  gender: z.nativeEnum(Gender).optional(),
});
