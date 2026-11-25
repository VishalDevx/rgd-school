/**
 * Cascading deletes for people records.
 *
 * Prisma enforced `onDelete: Cascade` in the database. MongoDB has no foreign
 * keys, so after the migration deleting a user left its Student/Staff row (and
 * that row's attendance, results, fees...) orphaned, pointing at a user that no
 * longer exists, which then crashed every page that reads `student.user.name`.
 *
 * The map below restores the old Prisma cascade rules for the people graph.
 * Children are deleted before parents, so an interrupted delete can simply be
 * retried.
 */

import mongoose, { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
// Import the model files for their side effect of registering every model.
import "@/models/User";
import "@/models/People";
import "@/models/Finance";
import "@/models/Academic";
import "@/models/Engagement";
import "@/models/School";

type Edge = { model: string; field: string; action?: "delete" | "unset" };

const CHILDREN: Record<string, Edge[]> = {
  User: [
    { model: "Account", field: "userId" },
    { model: "Session", field: "userId" },
    { model: "Notification", field: "userId" },
    { model: "Staff", field: "userId" },
    { model: "Student", field: "userId" },
  ],
  Staff: [
    { model: "StaffDocument", field: "staffId" },
    { model: "StaffAttendance", field: "staffId" },
    { model: "Leave", field: "staffId" },
    { model: "IDCard", field: "staffId" },
    // Optional teacher links are cleared rather than deleting the class/subject.
    { model: "Class", field: "teacherId", action: "unset" },
    { model: "Subject", field: "teacherId", action: "unset" },
    { model: "Timetable", field: "teacherId", action: "unset" },
  ],
  Student: [
    { model: "StudentDocument", field: "studentId" },
    { model: "TransportAssignment", field: "studentId" },
    { model: "Attendance", field: "studentId" },
    { model: "Result", field: "studentId" },
    { model: "HomeworkSubmission", field: "studentId" },
    { model: "Leave", field: "studentId" },
    { model: "IDCard", field: "studentId" },
    { model: "FeeTransaction", field: "studentId" },
    { model: "FeePayment", field: "studentId" },
  ],
};

async function cascade(modelName: string, ids: Types.ObjectId[]): Promise<void> {
  if (ids.length === 0) return;

  for (const edge of CHILDREN[modelName] ?? []) {
    const child = mongoose.model(edge.model);
    const filter = { [edge.field]: { $in: ids } };

    if (edge.action === "unset") {
      await child.updateMany(filter, { $unset: { [edge.field]: 1 } });
      continue;
    }
    if (CHILDREN[edge.model]) {
      const grandchildren = await child.find(filter).select("_id").lean<Array<{ _id: Types.ObjectId }>>();
      await cascade(edge.model, grandchildren.map((g) => g._id));
    }
    await child.deleteMany(filter);
  }

  await mongoose.model(modelName).deleteMany({ _id: { $in: ids } });
}

export class DeleteBlockedError extends Error {
  readonly status = 409;
}

/**
 * Delete a user and everything that hangs off them.
 *
 * Refuses (DeleteBlockedError) when the user is a student with fee receipts on
 * record: those are financial records, so deactivate the student instead.
 */
export async function deleteUserCascade(userId: string): Promise<void> {
  if (!Types.ObjectId.isValid(userId)) throw new DeleteBlockedError("Invalid user id");
  await connectDB();

  const id = new Types.ObjectId(userId);
  const student = await mongoose.model("Student").findOne({ userId: id }).select("_id").lean<{ _id: Types.ObjectId }>();
  if (student) {
    const receipts = await mongoose.model("FeeTransaction").countDocuments({ studentId: student._id, voided: { $ne: true } });
    const legacyPaid = await mongoose.model("FeePayment").countDocuments({ studentId: student._id, amountPaid: { $gt: 0 } });
    if (receipts + legacyPaid > 0) {
      throw new DeleteBlockedError(
        "This student has fee payments on record. Deactivate the student instead of deleting, so the receipts are kept."
      );
    }
  }

  await cascade("User", [id]);
}
