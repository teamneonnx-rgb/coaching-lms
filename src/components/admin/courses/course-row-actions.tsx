"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteCourse } from "@/lib/actions/admin/courses";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import {
  CourseFormDialog,
  type EditableCourse,
  type Option,
} from "@/components/admin/courses/course-form-dialog";

export function CourseRowActions({
  course,
  batches,
  teachers,
}: {
  course: EditableCourse;
  batches: Option[];
  teachers: Option[];
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <CourseFormDialog
        course={course}
        batches={batches}
        teachers={teachers}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label="Edit course">
            <Pencil className="size-4" />
          </Button>
        }
      />
      <ConfirmDeleteDialog
        title="Delete course"
        description={`Delete "${course.title}"? Its chapters and resources will also be removed.`}
        onConfirm={() => deleteCourse(course.id)}
      />
    </div>
  );
}
