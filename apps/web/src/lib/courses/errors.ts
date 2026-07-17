export class CourseResourceNotFoundError extends Error {
  readonly code = "course_resource_not_found";

  constructor(readonly resource: "course" | "lesson" | "block") {
    super(`${resource[0].toUpperCase()}${resource.slice(1)} not found`);
    this.name = "CourseResourceNotFoundError";
  }
}

export class CourseEditRejectedError extends Error {
  readonly code = "course_edit_rejected";

  constructor(message: string) {
    super(message);
    this.name = "CourseEditRejectedError";
  }
}
