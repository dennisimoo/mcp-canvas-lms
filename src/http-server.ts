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

      console.error('[MCP SSE] Client connected to /sse endpoint');

      // Send endpoint event to tell client where to send messages
      res.write(`event: endpoint\n`);
      res.write(`data: /message\n\n`);

      // Keep connection alive with periodic ping
      const keepAlive = setInterval(() => {
        res.write(': ping\n\n');
      }, 30000);

      req.on('close', () => {
        console.error('[MCP SSE] Client disconnected from /sse');
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

    // Root endpoint - Can act as both info endpoint and SSE connection
    this.app.get('/', (req: Request, res: Response) => {
      // Check if client wants SSE (Accept header includes text/event-stream)
      const acceptHeader = req.headers.accept || '';

      if (acceptHeader.includes('text/event-stream')) {
        // Client wants SSE connection
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');

        console.error('[MCP SSE] Client connected to root SSE endpoint');

        // Send endpoint event
        res.write(`event: endpoint\n`);
        res.write(`data: /message\n\n`);

        // Keep alive
        const keepAlive = setInterval(() => {
          res.write(': ping\n\n');
        }, 30000);

        req.on('close', () => {
          console.error('[MCP SSE] Client disconnected');
          clearInterval(keepAlive);
          res.end();
        });
      } else {
        // Regular JSON info response
        res.json({
          service: 'canvas-mcp-server',
          version: this.version,
          mode: 'http',
          protocol: 'mcp-http-sse',
          transport: 'sse',
          endpoints: {
            sse: '/',
            message: '/message',
            health: '/api/health',
            docs: '/docs',
            api: '/api'
          },
          description: 'Canvas MCP Server with HTTP+SSE transport',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle POST to root path (some MCP clients may send messages here)
    this.app.post('/', async (req: Request, res: Response) => {
      try {
        // Set CORS and content type headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');

        const { method, params, id } = req.body;

        console.error(`[MCP Message] Method: ${method}, ID: ${id}`);
        if (params) console.error(`[MCP Message] Params:`, JSON.stringify(params).substring(0, 200));

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

          case 'notifications/initialized':
            // This is a notification, no response needed
            res.status(200).end();
            break;

          case 'tools/list':
            res.json({
              jsonrpc: '2.0',
              result: {
                tools: this.getAllTools()
              },
              id
            });
            break;

          case 'tools/call':
            const toolResult = await this.handleToolCall(params);
            res.json({
              jsonrpc: '2.0',
              result: toolResult.result,
              error: toolResult.error,
              id
            });
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

    this.app.post('/message', async (req: Request, res: Response) => {
      try {
        // Set CORS and content type headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');

        const { method, params, id } = req.body;

        console.error(`[MCP Message] Method: ${method}, ID: ${id}`);
        if (params) console.error(`[MCP Message] Params:`, JSON.stringify(params).substring(0, 200));

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

          case 'notifications/initialized':
            // This is a notification, no response needed
            res.status(200).end();
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

  private getAllTools(): any[] {
    return [
      // Health
      {
        name: 'canvas_health_check',
        description: 'Check the health and connectivity of the Canvas API',
        inputSchema: { type: 'object', properties: {}, required: [] }
      },
      // Courses
      {
        name: 'canvas_list_courses',
        description: 'List all courses for the current user',
        inputSchema: {
          type: 'object',
          properties: {
            include_ended: { type: 'boolean', description: 'Include ended courses' }
          },
          required: []
        }
      },
      {
        name: 'canvas_get_course',
        description: 'Get detailed information about a specific course',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: { type: 'number', description: 'ID of the course' }
          },
          required: ['course_id']
        }
      },
      // Assignments
      {
        name: 'canvas_list_assignments',
        description: 'List assignments for a course (includes due dates)',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: { type: 'number', description: 'ID of the course' },
            include_submissions: { type: 'boolean', description: 'Include submission data' }
          },
          required: ['course_id']
        }
      },
      {
        name: 'canvas_get_assignment',
        description: 'Get detailed information about a specific assignment (includes due date)',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: { type: 'number', description: 'ID of the course' },
            assignment_id: { type: 'number', description: 'ID of the assignment' },
            include_submission: { type: 'boolean', description: 'Include user\'s submission data' }
          },
          required: ['course_id', 'assignment_id']
        }
      },
      {
        name: 'canvas_get_upcoming_assignments',
        description: 'Get upcoming assignment due dates',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of assignments to return' }
          },
          required: []
        }
      },
      // Submissions
      {
        name: 'canvas_get_submission',
        description: 'Get submission details for an assignment',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: { type: 'number', description: 'ID of the course' },
            assignment_id: { type: 'number', description: 'ID of the assignment' },
            user_id: { type: 'number', description: 'ID of the user (optional, defaults to self)' }
          },
          required: ['course_id', 'assignment_id']
        }
      },
      {
        name: 'canvas_submit_assignment',
        description: 'Submit work for an assignment',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: { type: 'number', description: 'ID of the course' },
            assignment_id: { type: 'number', description: 'ID of the assignment' },
            submission_type: { type: 'string', enum: ['online_text_entry', 'online_url', 'online_upload'], description: 'Type of submission' },
            body: { type: 'string', description: 'Text content for text submissions' },
            url: { type: 'string', description: 'URL for URL submissions' },
            file_ids: { type: 'array', items: { type: 'number' }, description: 'File IDs for file submissions' }
          },
          required: ['course_id', 'assignment_id', 'submission_type']
        }
      },
      // Modules
      {
        name: 'canvas_list_modules',
        description: 'List all modules in a course',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: { type: 'number', description: 'ID of the course' }
          },
          required: ['course_id']
        }
      },
      {
        name: 'canvas_list_module_items',
        description: 'List all items in a module',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: { type: 'number', description: 'ID of the course' },
            module_id: { type: 'number', description: 'ID of the module' }
          },
          required: ['course_id', 'module_id']
        }
      },
      // Discussions
      {
        name: 'canvas_list_discussion_topics',
        description: 'List all discussion topics in a course',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: { type: 'number', description: 'ID of the course' }
          },
          required: ['course_id']
        }
      },
      // Quizzes
      {
        name: 'canvas_list_quizzes',
        description: 'List all quizzes in a course',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: { type: 'number', description: 'ID of the course' }
          },
          required: ['course_id']
        }
      },
      // User & Profile
      {
        name: 'canvas_get_user_profile',
        description: 'Get current user\'s profile',
        inputSchema: { type: 'object', properties: {}, required: [] }
      },
      // Grades
      {
        name: 'canvas_get_course_grades',
        description: 'Get grades for a course',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: { type: 'number', description: 'ID of the course' }
          },
          required: ['course_id']
        }
      },
      {
        name: 'canvas_get_user_grades',
        description: 'Get all grades for the current user',
        inputSchema: { type: 'object', properties: {}, required: [] }
      },
      // Dashboard
      {
        name: 'canvas_get_dashboard',
        description: 'Get user\'s dashboard information',
        inputSchema: { type: 'object', properties: {}, required: [] }
      },
      {
        name: 'canvas_get_dashboard_cards',
        description: 'Get dashboard course cards',
        inputSchema: { type: 'object', properties: {}, required: [] }
      },
      // Files
      {
        name: 'canvas_list_files',
        description: 'List files in a course or folder',
        inputSchema: {
          type: 'object',
          properties: {
            course_id: { type: 'number', description: 'ID of the course' },
            folder_id: { type: 'number', description: 'ID of the folder (optional)' }
          },
          required: ['course_id']
        }
      },
      // Calendar
      {
        name: 'canvas_list_calendar_events',
        description: 'List calendar events',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: { type: 'string', description: 'Start date (ISO format)' },
            end_date: { type: 'string', description: 'End date (ISO format)' }
          },
          required: []
        }
      }
    ];
  }

  private async handleToolCall(params: any): Promise<{ result?: any; error?: any }> {
    try {
      const { name } = params;
      const args = params.arguments || {};

      console.error(`[MCP Tool Call] ${name}`);

      switch (name) {
        case 'canvas_health_check': {
          const health = await this.client.healthCheck();
          return { result: { content: [{ type: 'text', text: JSON.stringify(health, null, 2) }] } };
        }

        case 'canvas_list_courses': {
          const { include_ended = false } = args;
          const courses = await this.client.listCourses(include_ended);
          return { result: { content: [{ type: 'text', text: JSON.stringify(courses, null, 2) }] } };
        }

        case 'canvas_get_course': {
          const { course_id } = args;
          if (!course_id) throw new Error('Missing required field: course_id');
          const course = await this.client.getCourse(course_id);
          return { result: { content: [{ type: 'text', text: JSON.stringify(course, null, 2) }] } };
        }

        case 'canvas_list_assignments': {
          const { course_id, include_submissions = false } = args;
          if (!course_id) throw new Error('Missing required field: course_id');
          const assignments = await this.client.listAssignments(course_id, include_submissions);
          return { result: { content: [{ type: 'text', text: JSON.stringify(assignments, null, 2) }] } };
        }

        case 'canvas_get_assignment': {
          const { course_id, assignment_id, include_submission = false } = args;
          if (!course_id || !assignment_id) throw new Error('Missing required fields: course_id and assignment_id');
          const assignment = await this.client.getAssignment(course_id, assignment_id, include_submission);
          return { result: { content: [{ type: 'text', text: JSON.stringify(assignment, null, 2) }] } };
        }

        case 'canvas_get_upcoming_assignments': {
          const { limit = 10 } = args;
          const assignments = await this.client.getUpcomingAssignments(limit);
          return { result: { content: [{ type: 'text', text: JSON.stringify(assignments, null, 2) }] } };
        }

        case 'canvas_get_submission': {
          const { course_id, assignment_id, user_id } = args;
          if (!course_id || !assignment_id) throw new Error('Missing required fields: course_id and assignment_id');
          const submission = await this.client.getSubmission(course_id, assignment_id, user_id || 'self');
          return { result: { content: [{ type: 'text', text: JSON.stringify(submission, null, 2) }] } };
        }

        case 'canvas_submit_assignment': {
          const submitArgs = args as SubmitAssignmentArgs;
          const { course_id, assignment_id, submission_type } = submitArgs;
          if (!course_id || !assignment_id || !submission_type) {
            throw new Error('Missing required fields: course_id, assignment_id, and submission_type');
          }
          const submission = await this.client.submitAssignment(submitArgs);
          return { result: { content: [{ type: 'text', text: JSON.stringify(submission, null, 2) }] } };
        }

        case 'canvas_list_modules': {
          const { course_id } = args;
          if (!course_id) throw new Error('Missing required field: course_id');
          const modules = await this.client.listModules(course_id);
          return { result: { content: [{ type: 'text', text: JSON.stringify(modules, null, 2) }] } };
        }

        case 'canvas_list_module_items': {
          const { course_id, module_id } = args;
          if (!course_id || !module_id) throw new Error('Missing required fields: course_id and module_id');
          const items = await this.client.listModuleItems(course_id, module_id);
          return { result: { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] } };
        }

        case 'canvas_list_discussion_topics': {
          const { course_id } = args;
          if (!course_id) throw new Error('Missing required field: course_id');
          const topics = await this.client.listDiscussionTopics(course_id);
          return { result: { content: [{ type: 'text', text: JSON.stringify(topics, null, 2) }] } };
        }

        case 'canvas_list_quizzes': {
          const { course_id } = args;
          if (!course_id) throw new Error('Missing required field: course_id');
          const quizzes = await this.client.listQuizzes(course_id);
          return { result: { content: [{ type: 'text', text: JSON.stringify(quizzes, null, 2) }] } };
        }

        case 'canvas_get_user_profile': {
          const profile = await this.client.getUserProfile();
          return { result: { content: [{ type: 'text', text: JSON.stringify(profile, null, 2) }] } };
        }

        case 'canvas_get_course_grades': {
          const { course_id } = args;
          if (!course_id) throw new Error('Missing required field: course_id');
          const grades = await this.client.getCourseGrades(course_id);
          return { result: { content: [{ type: 'text', text: JSON.stringify(grades, null, 2) }] } };
        }

        case 'canvas_get_user_grades': {
          const grades = await this.client.getUserGrades();
          return { result: { content: [{ type: 'text', text: JSON.stringify(grades, null, 2) }] } };
        }

        case 'canvas_get_dashboard': {
          const dashboard = await this.client.getDashboard();
          return { result: { content: [{ type: 'text', text: JSON.stringify(dashboard, null, 2) }] } };
        }

        case 'canvas_get_dashboard_cards': {
          const cards = await this.client.getDashboardCards();
          return { result: { content: [{ type: 'text', text: JSON.stringify(cards, null, 2) }] } };
        }

        case 'canvas_list_files': {
          const { course_id, folder_id } = args;
          if (!course_id) throw new Error('Missing required field: course_id');
          const files = await this.client.listFiles(course_id, folder_id);
          return { result: { content: [{ type: 'text', text: JSON.stringify(files, null, 2) }] } };
        }

        case 'canvas_list_calendar_events': {
          const { start_date, end_date } = args;
          const events = await this.client.listCalendarEvents(start_date, end_date);
          return { result: { content: [{ type: 'text', text: JSON.stringify(events, null, 2) }] } };
        }

        default:
          return { error: { code: -32601, message: `Tool not found: ${name}` } };
      }
    } catch (error) {
      console.error('[MCP Tool Error]', error);
      return {
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error'
        }
      };
    }
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
