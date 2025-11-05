// src/http-server.ts
// HTTP REST API server using Express.js with Swagger/OpenAPI documentation

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
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
import swaggerUi from 'swagger-ui-express';
import { OpenAPIV3 } from 'openapi-types';

export interface HttpServerConfig {
  port: number;
  canvasClient: CanvasClient;
  version: string;
}

export class CanvasHttpServer {
  private app: Express;
  private client: CanvasClient;
  private port: number;
  private version: string;

  constructor(config: HttpServerConfig) {
    this.app = express();
    this.client = config.canvasClient;
    this.port = config.port;
    this.version = config.version;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // CORS - allow all origins for API access
    this.app.use(cors());

    // JSON body parser
    this.app.use(express.json({ limit: '10mb' }));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.error(`[HTTP] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
      });
      next();
    });
  }

  private setupRoutes(): void {
    const apiRouter = express.Router();

    // Health check endpoint
    apiRouter.get('/health', async (req: Request, res: Response) => {
      try {
        await this.client.healthCheck();
        res.json({
          status: 'healthy',
          service: 'canvas-mcp-server',
          version: this.version,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          service: 'canvas-mcp-server',
          version: this.version,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // ============= COURSE ENDPOINTS =============

    apiRouter.get('/courses', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const includeEnded = req.query.include_ended === 'true';
        const courses = await this.client.listCourses(includeEnded);
        res.json({ data: courses, count: courses.length });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.get('/courses/:id', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.id);
        const course = await this.client.getCourse(courseId);
        res.json({ data: course });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.post('/courses', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const args: CreateCourseArgs = req.body;
        const course = await this.client.createCourse(args);
        res.status(201).json({ data: course });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.put('/courses/:id', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.id);
        const args: UpdateCourseArgs = { ...req.body, course_id: courseId };
        const course = await this.client.updateCourse(args);
        res.json({ data: course });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.delete('/courses/:id', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.id);
        await this.client.deleteCourse(courseId);
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    });

    // ============= ASSIGNMENT ENDPOINTS =============

    apiRouter.get('/courses/:courseId/assignments', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.courseId);
        const includeSubmissions = req.query.include_submissions === 'true';
        const assignments = await this.client.listAssignments(courseId, includeSubmissions);
        res.json({ data: assignments, count: assignments.length });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.get('/courses/:courseId/assignments/:id', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.courseId);
        const assignmentId = parseInt(req.params.id);
        const includeSubmission = req.query.include_submission === 'true';
        const assignment = await this.client.getAssignment(courseId, assignmentId, includeSubmission);
        res.json({ data: assignment });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.post('/courses/:courseId/assignments', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.courseId);
        const args: CreateAssignmentArgs = { ...req.body, course_id: courseId };
        const assignment = await this.client.createAssignment(args);
        res.status(201).json({ data: assignment });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.put('/courses/:courseId/assignments/:id', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.courseId);
        const assignmentId = parseInt(req.params.id);
        const args: UpdateAssignmentArgs = { ...req.body, course_id: courseId, assignment_id: assignmentId };
        const assignment = await this.client.updateAssignment(args);
        res.json({ data: assignment });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.delete('/courses/:courseId/assignments/:id', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.courseId);
        const assignmentId = parseInt(req.params.id);
        await this.client.deleteAssignment(courseId, assignmentId);
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    });

    // ============= SUBMISSION ENDPOINTS =============

    apiRouter.get('/courses/:courseId/assignments/:assignmentId/submissions', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.courseId);
        const assignmentId = parseInt(req.params.assignmentId);
        const userId = req.query.user_id ? parseInt(req.query.user_id as string) : undefined;

        if (userId) {
          const submission = await this.client.getSubmission(courseId, assignmentId, userId);
          res.json({ data: submission });
        } else {
          const submissions = await this.client.getSubmissions(courseId, assignmentId);
          res.json({ data: submissions, count: submissions.length });
        }
      } catch (error) {
        next(error);
      }
    });

    apiRouter.post('/courses/:courseId/assignments/:assignmentId/submissions', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.courseId);
        const assignmentId = parseInt(req.params.assignmentId);
        const args: SubmitAssignmentArgs = { ...req.body, course_id: courseId, assignment_id: assignmentId };
        const submission = await this.client.submitAssignment(args);
        res.status(201).json({ data: submission });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.post('/courses/:courseId/assignments/:assignmentId/submissions/:userId/grade', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.courseId);
        const assignmentId = parseInt(req.params.assignmentId);
        const userId = parseInt(req.params.userId);
        const args: SubmitGradeArgs = { ...req.body, course_id: courseId, assignment_id: assignmentId, user_id: userId };
        const result = await this.client.submitGrade(args);
        res.json({ data: result });
      } catch (error) {
        next(error);
      }
    });

    // ============= MODULE ENDPOINTS =============

    apiRouter.get('/courses/:courseId/modules', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.courseId);
        const modules = await this.client.listModules(courseId);
        res.json({ data: modules, count: modules.length });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.get('/courses/:courseId/modules/:moduleId', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.courseId);
        const moduleId = parseInt(req.params.moduleId);
        const module = await this.client.getModule(courseId, moduleId);
        res.json({ data: module });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.get('/courses/:courseId/modules/:moduleId/items', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.courseId);
        const moduleId = parseInt(req.params.moduleId);
        const items = await this.client.listModuleItems(courseId, moduleId);
        res.json({ data: items, count: items.length });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.post('/courses/:courseId/modules/:moduleId/items/:itemId/complete', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.courseId);
        const moduleId = parseInt(req.params.moduleId);
        const itemId = parseInt(req.params.itemId);
        const result = await this.client.markModuleItemComplete(courseId, moduleId, itemId);
        res.json({ data: result });
      } catch (error) {
        next(error);
      }
    });

    // ============= DISCUSSION ENDPOINTS =============

    apiRouter.get('/courses/:courseId/discussions', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.courseId);
        const topics = await this.client.listDiscussionTopics(courseId);
        res.json({ data: topics, count: topics.length });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.get('/courses/:courseId/discussions/:topicId', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.courseId);
        const topicId = parseInt(req.params.topicId);
        const topic = await this.client.getDiscussionTopic(courseId, topicId);
        res.json({ data: topic });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.post('/courses/:courseId/discussions/:topicId/entries', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.courseId);
        const topicId = parseInt(req.params.topicId);
        const { message } = req.body;
        const result = await this.client.postToDiscussion(courseId, topicId, message);
        res.status(201).json({ data: result });
      } catch (error) {
        next(error);
      }
    });

    // ============= QUIZ ENDPOINTS =============

    apiRouter.get('/courses/:courseId/quizzes', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = req.params.courseId;
        const quizzes = await this.client.listQuizzes(courseId);
        res.json({ data: quizzes, count: quizzes.length });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.get('/courses/:courseId/quizzes/:quizId', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = req.params.courseId;
        const quizId = parseInt(req.params.quizId);
        const quiz = await this.client.getQuiz(courseId, quizId);
        res.json({ data: quiz });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.post('/courses/:courseId/quizzes', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.courseId);
        const quiz = await this.client.createQuiz(courseId, req.body);
        res.status(201).json({ data: quiz });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.post('/courses/:courseId/quizzes/:quizId/start', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.courseId);
        const quizId = parseInt(req.params.quizId);
        const attempt = await this.client.startQuizAttempt(courseId, quizId);
        res.status(201).json({ data: attempt });
      } catch (error) {
        next(error);
      }
    });

    // ============= USER & PROFILE ENDPOINTS =============

    apiRouter.get('/profile', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const profile = await this.client.getUserProfile();
        res.json({ data: profile });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.put('/profile', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const profile = await this.client.updateUserProfile(req.body);
        res.json({ data: profile });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.get('/courses/:courseId/users', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.courseId);
        const users = await this.client.listUsers(courseId);
        res.json({ data: users, count: users.length });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.post('/courses/:courseId/enrollments', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.courseId);
        const args: EnrollUserArgs = { ...req.body, course_id: courseId };
        const enrollment = await this.client.enrollUser(args);
        res.status(201).json({ data: enrollment });
      } catch (error) {
        next(error);
      }
    });

    // ============= GRADES ENDPOINTS =============

    apiRouter.get('/courses/:courseId/grades', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.courseId);
        const grades = await this.client.getCourseGrades(courseId);
        res.json({ data: grades });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.get('/grades', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const grades = await this.client.getUserGrades();
        res.json({ data: grades, count: grades.length });
      } catch (error) {
        next(error);
      }
    });

    // ============= FILES & FOLDERS ENDPOINTS =============

    apiRouter.get('/courses/:courseId/files', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.courseId);
        const folderId = req.query.folder_id ? parseInt(req.query.folder_id as string) : undefined;
        const files = await this.client.listFiles(courseId, folderId);
        res.json({ data: files, count: files.length });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.get('/files/:fileId', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const fileId = parseInt(req.params.fileId);
        const file = await this.client.getFile(fileId);
        res.json({ data: file });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.get('/courses/:courseId/folders', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courseId = parseInt(req.params.courseId);
        const folders = await this.client.listFolders(courseId);
        res.json({ data: folders, count: folders.length });
      } catch (error) {
        next(error);
      }
    });

    // ============= DASHBOARD ENDPOINTS =============

    apiRouter.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const dashboard = await this.client.getDashboard();
        res.json({ data: dashboard });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.get('/dashboard/cards', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const cards = await this.client.getDashboardCards();
        res.json({ data: cards, count: cards.length });
      } catch (error) {
        next(error);
      }
    });

    // ============= ACCOUNT MANAGEMENT ENDPOINTS =============

    apiRouter.get('/accounts/:accountId', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const accountId = parseInt(req.params.accountId);
        const account = await this.client.getAccount(accountId);
        res.json({ data: account });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.get('/accounts/:accountId/courses', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const accountId = parseInt(req.params.accountId);
        const args: ListAccountCoursesArgs = {
          account_id: accountId,
          ...req.query
        };
        const courses = await this.client.listAccountCourses(args);
        res.json({ data: courses, count: courses.length });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.get('/accounts/:accountId/users', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const accountId = parseInt(req.params.accountId);
        const args: ListAccountUsersArgs = {
          account_id: accountId,
          ...req.query
        };
        const users = await this.client.listAccountUsers(args);
        res.json({ data: users, count: users.length });
      } catch (error) {
        next(error);
      }
    });

    apiRouter.post('/accounts/:accountId/users', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const accountId = parseInt(req.params.accountId);
        const args: CreateUserArgs = { ...req.body, account_id: accountId };
        const user = await this.client.createUser(args);
        res.status(201).json({ data: user });
      } catch (error) {
        next(error);
      }
    });

    // Mount API routes under /api
    this.app.use('/api', apiRouter);

    // Swagger/OpenAPI Documentation
    const swaggerDocument = this.generateOpenAPISpec();
    this.app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    // MCP Protocol Endpoints (for Poke and other MCP HTTP+SSE clients)

    // SSE endpoint - Server-Sent Events for streaming from server to client
    this.app.get('/sse', (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      console.error('[MCP SSE] Client connected');

      // Send endpoint event to tell client where to send messages
      res.write(`event: endpoint\n`);
      res.write(`data: ${JSON.stringify({ uri: '/message' })}\n\n`);

      // Keep connection alive with periodic ping
      const keepAlive = setInterval(() => {
        res.write(': ping\n\n');
      }, 30000);

      req.on('close', () => {
        console.error('[MCP SSE] Client disconnected');
        clearInterval(keepAlive);
        res.end();
      });
    });

    // MCP Message endpoint (JSON-RPC)
    apiRouter.post('/message', async (req: Request, res: Response) => {
      try {
        const { method, params, id } = req.body;

        switch (method) {
          case 'initialize':
            res.json({
              jsonrpc: '2.0',
              result: {
                protocolVersion: '2024-11-05',
                serverInfo: {
                  name: 'canvas-mcp-server',
                  version: this.version
                },
                capabilities: {
                  resources: {},
                  tools: {}
                }
              },
              id
            });
            break;

          case 'tools/list':
            res.json({
              jsonrpc: '2.0',
              result: {
                tools: [
                  {
                    name: 'canvas_list_courses',
                    description: 'List all Canvas courses',
                    inputSchema: { type: 'object', properties: {} }
                  },
                  {
                    name: 'canvas_get_course',
                    description: 'Get Canvas course details',
                    inputSchema: {
                      type: 'object',
                      properties: { course_id: { type: 'number' } },
                      required: ['course_id']
                    }
                  }
                  // Add more tools as needed
                ]
              },
              id
            });
            break;

          case 'tools/call':
            const { name, arguments: args } = params;

            // Example tool call handling
            if (name === 'canvas_list_courses') {
              const courses = await this.client.listCourses();
              res.json({
                jsonrpc: '2.0',
                result: {
                  content: [{ type: 'text', text: JSON.stringify(courses, null, 2) }]
                },
                id
              });
            } else {
              res.json({
                jsonrpc: '2.0',
                error: { code: -32601, message: `Tool not found: ${name}` },
                id
              });
            }
            break;

          default:
            res.json({
              jsonrpc: '2.0',
              error: { code: -32601, message: `Method not found: ${method}` },
              id
            });
        }
      } catch (error) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Internal error'
          },
          id: req.body.id || null
        });
      }
    });

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        service: 'canvas-mcp-server',
        version: this.version,
        mode: 'http',
        protocol: 'mcp-http-sse',
        transport: 'sse',
        endpoints: {
          sse: '/sse',
          message: '/message',
          health: '/api/health',
          docs: '/docs',
          api: '/api'
        },
        description: 'Canvas MCP Server with HTTP+SSE transport',
        timestamp: new Date().toISOString()
      });
    });

    this.app.post('/message', async (req: Request, res: Response) => {
      try {
        const { method, params, id } = req.body;

        switch (method) {
          case 'initialize':
            res.json({
              jsonrpc: '2.0',
              result: {
                protocolVersion: '2024-11-05',
                serverInfo: {
                  name: 'canvas-mcp-server',
                  version: this.version
                },
                capabilities: {
                  resources: {},
                  tools: {}
                }
              },
              id
            });
            break;

          case 'tools/list':
            res.json({
              jsonrpc: '2.0',
              result: {
                tools: [
                  {
                    name: 'canvas_list_courses',
                    description: 'List all Canvas courses',
                    inputSchema: { type: 'object', properties: {} }
                  },
                  {
                    name: 'canvas_get_course',
                    description: 'Get Canvas course details',
                    inputSchema: {
                      type: 'object',
                      properties: { course_id: { type: 'number' } },
                      required: ['course_id']
                    }
                  }
                ]
              },
              id
            });
            break;

          case 'tools/call':
            const { name } = params;
            const args = params.arguments || {};

            if (name === 'canvas_list_courses') {
              const courses = await this.client.listCourses();
              res.json({
                jsonrpc: '2.0',
                result: {
                  content: [{ type: 'text', text: JSON.stringify(courses, null, 2) }]
                },
                id
              });
            } else {
              res.json({
                jsonrpc: '2.0',
                error: { code: -32601, message: `Tool not found: ${name}` },
                id
              });
            }
            break;

          default:
            res.json({
              jsonrpc: '2.0',
              error: { code: -32601, message: `Method not found: ${method}` },
              id
            });
        }
      } catch (error) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Internal error'
          },
          id: req.body.id || null
        });
      }
    });
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.path}`,
        timestamp: new Date().toISOString()
      });
    });

    // Global error handler
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('[HTTP Error]', err);

      const statusCode = (err as any).statusCode || 500;
      const message = err.message || 'Internal Server Error';

      res.status(statusCode).json({
        error: err.name || 'Error',
        message: message,
        timestamp: new Date().toISOString()
      });
    });
  }

  private generateOpenAPISpec(): OpenAPIV3.Document {
    return {
      openapi: '3.0.0',
      info: {
        title: 'Canvas MCP Server API',
        version: this.version,
        description: 'RESTful HTTP API for Canvas LMS integration. Provides comprehensive access to Canvas courses, assignments, submissions, users, and more.',
        contact: {
          name: 'Canvas MCP Server',
          url: 'https://github.com/dennisimoo/mcp-canvas-lms'
        }
      },
      servers: [
        {
          url: `http://localhost:${this.port}`,
          description: 'Local development server'
        }
      ],
      tags: [
        { name: 'Health', description: 'Health check endpoints' },
        { name: 'Courses', description: 'Course management' },
        { name: 'Assignments', description: 'Assignment management' },
        { name: 'Submissions', description: 'Assignment submissions and grading' },
        { name: 'Modules', description: 'Course modules and items' },
        { name: 'Discussions', description: 'Discussion topics and posts' },
        { name: 'Quizzes', description: 'Quiz management' },
        { name: 'Users', description: 'User profiles and management' },
        { name: 'Grades', description: 'Grade information' },
        { name: 'Files', description: 'File and folder management' },
        { name: 'Dashboard', description: 'User dashboard' },
        { name: 'Accounts', description: 'Account administration' }
      ],
      paths: {
        '/api/health': {
          get: {
            tags: ['Health'],
            summary: 'Health check',
            description: 'Check if the Canvas API connection is healthy',
            responses: {
              '200': {
                description: 'Service is healthy',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'healthy' },
                        service: { type: 'string', example: 'canvas-mcp-server' },
                        version: { type: 'string', example: this.version },
                        timestamp: { type: 'string', format: 'date-time' }
                      }
                    }
                  }
                }
              },
              '503': {
                description: 'Service is unhealthy'
              }
            }
          }
        },
        '/api/courses': {
          get: {
            tags: ['Courses'],
            summary: 'List all courses',
            description: 'Get a list of all courses for the current user',
            parameters: [
              {
                name: 'include_ended',
                in: 'query',
                schema: { type: 'boolean' },
                description: 'Include ended courses'
              }
            ],
            responses: {
              '200': {
                description: 'List of courses',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: { type: 'array', items: { type: 'object' } },
                        count: { type: 'number' }
                      }
                    }
                  }
                }
              }
            }
          },
          post: {
            tags: ['Courses'],
            summary: 'Create a new course',
            description: 'Create a new course in Canvas',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['account_id', 'name'],
                    properties: {
                      account_id: { type: 'number' },
                      name: { type: 'string' },
                      course_code: { type: 'string' },
                      start_at: { type: 'string', format: 'date-time' },
                      end_at: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            },
            responses: {
              '201': {
                description: 'Course created successfully'
              }
            }
          }
        },
        '/api/courses/{id}': {
          get: {
            tags: ['Courses'],
            summary: 'Get course details',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'number' },
                description: 'Course ID'
              }
            ],
            responses: {
              '200': {
                description: 'Course details'
              }
            }
          },
          put: {
            tags: ['Courses'],
            summary: 'Update a course',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'number' }
              }
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      course_code: { type: 'string' }
                    }
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Course updated successfully'
              }
            }
          },
          delete: {
            tags: ['Courses'],
            summary: 'Delete a course',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'number' }
              }
            ],
            responses: {
              '204': {
                description: 'Course deleted successfully'
              }
            }
          }
        },
        '/api/profile': {
          get: {
            tags: ['Users'],
            summary: 'Get user profile',
            responses: {
              '200': {
                description: 'User profile data'
              }
            }
          }
        },
        '/api/dashboard': {
          get: {
            tags: ['Dashboard'],
            summary: 'Get user dashboard',
            responses: {
              '200': {
                description: 'Dashboard data'
              }
            }
          }
        }
      },
      components: {
        schemas: {},
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            description: 'Canvas API token configured via environment variables'
          }
        }
      }
    };
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`✅ MCP HTTP server running at http://localhost:${this.port}`);
        console.log(`📚 API Documentation available at http://localhost:${this.port}/docs`);
        console.log(`🏥 Health check available at http://localhost:${this.port}/api/health`);
        resolve();
      });
    });
  }
}
