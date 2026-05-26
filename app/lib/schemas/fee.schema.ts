import { z } from "zod";

export const FeeStructureSchema = z.object({
  classId: z.string(),
  name: z.string().optional(),
  examFee: z.number().optional(),
  transportFee: z.number().optional(),
  miscFee: z.number().optional(),
});
