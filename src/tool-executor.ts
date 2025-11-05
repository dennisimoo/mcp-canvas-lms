// src/tool-executor.ts
// Shared tool execution logic for both stdio and HTTP transports

import { CanvasClient } from './client.js';
import {
  CreateCourseArgs,
  UpdateCourseArgs,
  CreateAssignmentArgs,
  UpdateAssignmentArgs,
  SubmitGradeArgs,
  EnrollUserArgs,
  SubmitAssignmentArgs,
  FileUploadArgs,
  CreateUserArgs,
  ListAccountCoursesArgs,
  ListAccountUsersArgs,
  CreateReportArgs
} from './types.js';

export async function executeCanvasTool(client: CanvasClient, toolName: string, args: any): Promise<any> {
  console.error(`[Canvas Tool] Executing: ${toolName}`);

  switch (toolName) {
    // Health check
    case "canvas_health_check": {
      const health = await client.healthCheck();
      return {
        content: [{ type: "text", text: JSON.stringify(health, null, 2) }]
      };
    }

    // Course management
    case "canvas_list_courses": {
      const { include_ended = false } = args;
      const courses = await client.listCourses(include_ended);
      return {
        content: [{ type: "text", text: JSON.stringify(courses, null, 2) }]
      };
    }

    case "canvas_get_course": {
      const { course_id } = args;
      if (!course_id) throw new Error("Missing required field: course_id");
      const course = await client.getCourse(course_id);
      return {
        content: [{ type: "text", text: JSON.stringify(course, null, 2) }]
      };
    }

    case "canvas_create_course": {
      const createCourseArgs = args as unknown as CreateCourseArgs;
      if (!createCourseArgs.account_id || !createCourseArgs.name) {
        throw new Error("Missing required fields: account_id and name");
      }
      const course = await client.createCourse(createCourseArgs);
      return {
        content: [{ type: "text", text: JSON.stringify(course, null, 2) }]
      };
    }

    case "canvas_update_course": {
      const updateCourseArgs = args as unknown as UpdateCourseArgs;
      if (!updateCourseArgs.course_id) {
        throw new Error("Missing required field: course_id");
      }
      const course = await client.updateCourse(updateCourseArgs);
      return {
        content: [{ type: "text", text: JSON.stringify(course, null, 2) }]
      };
    }

    // Assignment management
    case "canvas_list_assignments": {
      const { course_id, include_submissions = false } = args;
      if (!course_id) throw new Error("Missing required field: course_id");
      const assignments = await client.listAssignments(course_id, include_submissions);
      return {
        content: [{ type: "text", text: JSON.stringify(assignments, null, 2) }]
      };
    }

    case "canvas_get_assignment": {
      const { course_id, assignment_id, include_submission = false } = args;
      if (!course_id || !assignment_id) {
        throw new Error("Missing required fields: course_id and assignment_id");
      }
      const assignment = await client.getAssignment(course_id, assignment_id, include_submission);
      return {
        content: [{ type: "text", text: JSON.stringify(assignment, null, 2) }]
      };
    }

    case "canvas_create_assignment": {
      const createAssignmentArgs = args as unknown as CreateAssignmentArgs;
      if (!createAssignmentArgs.course_id || !createAssignmentArgs.name) {
        throw new Error("Missing required fields: course_id and name");
      }
      const assignment = await client.createAssignment(createAssignmentArgs);
      return {
        content: [{ type: "text", text: JSON.stringify(assignment, null, 2) }]
      };
    }

    case "canvas_update_assignment": {
      const updateAssignmentArgs = args as unknown as UpdateAssignmentArgs;
      if (!updateAssignmentArgs.course_id || !updateAssignmentArgs.assignment_id) {
        throw new Error("Missing required fields: course_id and assignment_id");
      }
      const assignment = await client.updateAssignment(updateAssignmentArgs);
      return {
        content: [{ type: "text", text: JSON.stringify(assignment, null, 2) }]
      };
    }

    case "canvas_list_assignment_groups": {
      const { course_id } = args;
      if (!course_id) throw new Error("Missing required field: course_id");
      const groups = await client.listAssignmentGroups(course_id);
      return {
        content: [{ type: "text", text: JSON.stringify(groups, null, 2) }]
      };
    }

    // Submission management
    case "canvas_get_submission": {
      const { course_id, assignment_id, user_id = 'self' } = args;
      if (!course_id || !assignment_id) {
        throw new Error("Missing required fields: course_id and assignment_id");
      }
      const submission = await client.getSubmission(course_id, assignment_id, user_id);
      return {
        content: [{ type: "text", text: JSON.stringify(submission, null, 2) }]
      };
    }

    case "canvas_submit_assignment": {
      const submitArgs = args as unknown as SubmitAssignmentArgs;
      if (!submitArgs.course_id || !submitArgs.assignment_id || !submitArgs.submission_type) {
        throw new Error("Missing required fields: course_id, assignment_id, and submission_type");
      }
      const submission = await client.submitAssignment(submitArgs);
      return {
        content: [{ type: "text", text: JSON.stringify(submission, null, 2) }]
      };
    }

    case "canvas_submit_grade": {
      const gradeArgs = args as unknown as SubmitGradeArgs;
      if (!gradeArgs.course_id || !gradeArgs.assignment_id || !gradeArgs.user_id || gradeArgs.grade === undefined) {
        throw new Error("Missing required fields: course_id, assignment_id, user_id, and grade");
      }
      const result = await client.submitGrade(gradeArgs);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    }

    // File management
    case "canvas_list_files": {
      const { course_id, folder_id } = args;
      if (!course_id) throw new Error("Missing required field: course_id");
      const files = await client.listFiles(course_id, folder_id);
      return {
        content: [{ type: "text", text: JSON.stringify(files, null, 2) }]
      };
    }

    case "canvas_get_file": {
      const { file_id } = args;
      if (!file_id) throw new Error("Missing required field: file_id");
      const file = await client.getFile(file_id);
      return {
        content: [{ type: "text", text: JSON.stringify(file, null, 2) }]
      };
    }

    case "canvas_list_folders": {
      const { course_id } = args;
      if (!course_id) throw new Error("Missing required field: course_id");
      const folders = await client.listFolders(course_id);
      return {
        content: [{ type: "text", text: JSON.stringify(folders, null, 2) }]
      };
    }

    // Page management
    case "canvas_list_pages": {
      const { course_id } = args;
      if (!course_id) throw new Error("Missing required field: course_id");
      const pages = await client.listPages(course_id);
      return {
        content: [{ type: "text", text: JSON.stringify(pages, null, 2) }]
      };
    }

    case "canvas_get_page": {
      const { course_id, page_url } = args;
      if (!course_id || !page_url) {
        throw new Error("Missing required fields: course_id and page_url");
      }
      const page = await client.getPage(course_id, page_url);
      return {
        content: [{ type: "text", text: JSON.stringify(page, null, 2) }]
      };
    }

    // Calendar and assignments
    case "canvas_list_calendar_events": {
      const events = await client.listCalendarEvents();
      return {
        content: [{ type: "text", text: JSON.stringify(events, null, 2) }]
      };
    }

    case "canvas_get_upcoming_assignments": {
      const assignments = await client.getUpcomingAssignments();
      return {
        content: [{ type: "text", text: JSON.stringify(assignments, null, 2) }]
      };
    }

    // Dashboard
    case "canvas_get_dashboard": {
      const dashboard = await client.getDashboard();
      return {
        content: [{ type: "text", text: JSON.stringify(dashboard, null, 2) }]
      };
    }

    case "canvas_get_dashboard_cards": {
      const cards = await client.getDashboardCards();
      return {
        content: [{ type: "text", text: JSON.stringify(cards, null, 2) }]
      };
    }

    // User profile
    case "canvas_get_user_profile": {
      const profile = await client.getUserProfile();
      return {
        content: [{ type: "text", text: JSON.stringify(profile, null, 2) }]
      };
    }

    case "canvas_update_user_profile": {
      const profile = await client.updateUserProfile(args);
      return {
        content: [{ type: "text", text: JSON.stringify(profile, null, 2) }]
      };
    }

    // Enrollment
    case "canvas_enroll_user": {
      const enrollArgs = args as unknown as EnrollUserArgs;
      if (!enrollArgs.course_id || !enrollArgs.user_id) {
        throw new Error("Missing required fields: course_id and user_id");
      }
      const enrollment = await client.enrollUser(enrollArgs);
      return {
        content: [{ type: "text", text: JSON.stringify(enrollment, null, 2) }]
      };
    }

    // Grades
    case "canvas_get_course_grades": {
      const { course_id } = args;
      if (!course_id) throw new Error("Missing required field: course_id");
      const grades = await client.getCourseGrades(course_id);
      return {
        content: [{ type: "text", text: JSON.stringify(grades, null, 2) }]
      };
    }

    case "canvas_get_user_grades": {
      const grades = await client.getUserGrades();
      return {
        content: [{ type: "text", text: JSON.stringify(grades, null, 2) }]
      };
    }

    // Account management
    case "canvas_get_account": {
      const { account_id } = args;
      if (!account_id) throw new Error("Missing required field: account_id");
      const account = await client.getAccount(account_id);
      return {
        content: [{ type: "text", text: JSON.stringify(account, null, 2) }]
      };
    }

    case "canvas_list_account_courses": {
      const accountCoursesArgs = args as unknown as ListAccountCoursesArgs;
      if (!accountCoursesArgs.account_id) {
        throw new Error("Missing required field: account_id");
      }
      const courses = await client.listAccountCourses(accountCoursesArgs);
      return {
        content: [{ type: "text", text: JSON.stringify(courses, null, 2) }]
      };
    }

    case "canvas_list_account_users": {
      const accountUsersArgs = args as unknown as ListAccountUsersArgs;
      if (!accountUsersArgs.account_id) {
        throw new Error("Missing required field: account_id");
      }
      const users = await client.listAccountUsers(accountUsersArgs);
      return {
        content: [{ type: "text", text: JSON.stringify(users, null, 2) }]
      };
    }

    case "canvas_create_user": {
      const createUserArgs = args as unknown as CreateUserArgs;
      if (!createUserArgs.account_id || !createUserArgs.user || !createUserArgs.pseudonym) {
        throw new Error("Missing required fields: account_id, user, and pseudonym");
      }
      const user = await client.createUser(createUserArgs);
      return {
        content: [{ type: "text", text: JSON.stringify(user, null, 2) }]
      };
    }

    case "canvas_list_sub_accounts": {
      const { account_id } = args;
      if (!account_id) throw new Error("Missing required field: account_id");
      const subAccounts = await client.listSubAccounts(account_id);
      return {
        content: [{ type: "text", text: JSON.stringify(subAccounts, null, 2) }]
      };
    }

    case "canvas_get_account_reports": {
      const { account_id } = args;
      if (!account_id) throw new Error("Missing required field: account_id");
      const reports = await client.getAccountReports(account_id);
      return {
        content: [{ type: "text", text: JSON.stringify(reports, null, 2) }]
      };
    }

    case "canvas_create_account_report": {
      const createReportArgs = args as unknown as CreateReportArgs;
      if (!createReportArgs.account_id || !createReportArgs.report) {
        throw new Error("Missing required fields: account_id and report");
      }
      const report = await client.createAccountReport(createReportArgs);
      return {
        content: [{ type: "text", text: JSON.stringify(report, null, 2) }]
      };
    }

    // Module management
    case "canvas_list_modules": {
      const { course_id } = args;
      if (!course_id) throw new Error("Missing required field: course_id");
      const modules = await client.listModules(course_id);
      return {
        content: [{ type: "text", text: JSON.stringify(modules, null, 2) }]
      };
    }

    case "canvas_get_module": {
      const { course_id, module_id } = args;
      if (!course_id || !module_id) {
        throw new Error("Missing required fields: course_id and module_id");
      }
      const module = await client.getModule(course_id, module_id);
      return {
        content: [{ type: "text", text: JSON.stringify(module, null, 2) }]
      };
    }

    case "canvas_list_module_items": {
      const { course_id, module_id } = args;
      if (!course_id || !module_id) {
        throw new Error("Missing required fields: course_id and module_id");
      }
      const items = await client.listModuleItems(course_id, module_id);
      return {
        content: [{ type: "text", text: JSON.stringify(items, null, 2) }]
      };
    }

    case "canvas_mark_module_item_complete": {
      const { course_id, module_id, item_id } = args;
      if (!course_id || !module_id || !item_id) {
        throw new Error("Missing required fields: course_id, module_id, and item_id");
      }
      const result = await client.markModuleItemComplete(course_id, module_id, item_id);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    }

    // Discussion management
    case "canvas_list_discussion_topics": {
      const { course_id } = args;
      if (!course_id) throw new Error("Missing required field: course_id");
      const topics = await client.listDiscussionTopics(course_id);
      return {
        content: [{ type: "text", text: JSON.stringify(topics, null, 2) }]
      };
    }

    case "canvas_get_discussion_topic": {
      const { course_id, topic_id } = args;
      if (!course_id || !topic_id) {
        throw new Error("Missing required fields: course_id and topic_id");
      }
      const topic = await client.getDiscussionTopic(course_id, topic_id);
      return {
        content: [{ type: "text", text: JSON.stringify(topic, null, 2) }]
      };
    }

    case "canvas_post_to_discussion": {
      const { course_id, topic_id, message } = args;
      if (!course_id || !topic_id || !message) {
        throw new Error("Missing required fields: course_id, topic_id, and message");
      }
      const result = await client.postToDiscussion(course_id, topic_id, message);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    }

    // Announcements
    case "canvas_list_announcements": {
      const { course_id } = args;
      if (!course_id) throw new Error("Missing required field: course_id");
      const announcements = await client.listAnnouncements(course_id);
      return {
        content: [{ type: "text", text: JSON.stringify(announcements, null, 2) }]
      };
    }

    // Quizzes
    case "canvas_list_quizzes": {
      const { course_id } = args;
      if (!course_id) throw new Error("Missing required field: course_id");
      const quizzes = await client.listQuizzes(course_id);
      return {
        content: [{ type: "text", text: JSON.stringify(quizzes, null, 2) }]
      };
    }

    case "canvas_get_quiz": {
      const { course_id, quiz_id } = args;
      if (!course_id || !quiz_id) {
        throw new Error("Missing required fields: course_id and quiz_id");
      }
      const quiz = await client.getQuiz(course_id, quiz_id);
      return {
        content: [{ type: "text", text: JSON.stringify(quiz, null, 2) }]
      };
    }

    case "canvas_create_quiz": {
      const { course_id } = args;
      if (!course_id) throw new Error("Missing required field: course_id");
      const quiz = await client.createQuiz(course_id, args);
      return {
        content: [{ type: "text", text: JSON.stringify(quiz, null, 2) }]
      };
    }

    case "canvas_start_quiz_attempt": {
      const { course_id, quiz_id } = args;
      if (!course_id || !quiz_id) {
        throw new Error("Missing required fields: course_id and quiz_id");
      }
      const attempt = await client.startQuizAttempt(course_id, quiz_id);
      return {
        content: [{ type: "text", text: JSON.stringify(attempt, null, 2) }]
      };
    }

    // Rubrics
    case "canvas_list_rubrics": {
      const { course_id } = args;
      if (!course_id) throw new Error("Missing required field: course_id");
      const rubrics = await client.listRubrics(course_id);
      return {
        content: [{ type: "text", text: JSON.stringify(rubrics, null, 2) }]
      };
    }

    case "canvas_get_rubric": {
      const { course_id, rubric_id } = args;
      if (!course_id || !rubric_id) {
        throw new Error("Missing required fields: course_id and rubric_id");
      }
      const rubric = await client.getRubric(course_id, rubric_id);
      return {
        content: [{ type: "text", text: JSON.stringify(rubric, null, 2) }]
      };
    }

    // Conversations
    case "canvas_list_conversations": {
      const conversations = await client.listConversations();
      return {
        content: [{ type: "text", text: JSON.stringify(conversations, null, 2) }]
      };
    }

    case "canvas_get_conversation": {
      const { conversation_id } = args;
      if (!conversation_id) throw new Error("Missing required field: conversation_id");
      const conversation = await client.getConversation(conversation_id);
      return {
        content: [{ type: "text", text: JSON.stringify(conversation, null, 2) }]
      };
    }

    case "canvas_create_conversation": {
      const { recipients, body, subject } = args;
      if (!recipients || !body) {
        throw new Error("Missing required fields: recipients and body");
      }
      const conversation = await client.createConversation(recipients, body, subject);
      return {
        content: [{ type: "text", text: JSON.stringify(conversation, null, 2) }]
      };
    }

    // Notifications
    case "canvas_list_notifications": {
      const notifications = await client.listNotifications();
      return {
        content: [{ type: "text", text: JSON.stringify(notifications, null, 2) }]
      };
    }

    // Syllabus
    case "canvas_get_syllabus": {
      const { course_id } = args;
      if (!course_id) throw new Error("Missing required field: course_id");
      const syllabus = await client.getSyllabus(course_id);
      return {
        content: [{ type: "text", text: JSON.stringify(syllabus, null, 2) }]
      };
    }

    default:
      throw new Error(`Tool not implemented: ${toolName}. Available tools: canvas_health_check, canvas_list_courses, canvas_get_user_grades, etc.`);
  }
}
