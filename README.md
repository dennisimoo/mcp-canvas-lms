# Canvas MCP Server v2.2.0

> A comprehensive Model Context Protocol (MCP) server for Canvas LMS with complete student, instructor, and account administration functionality

## 🚀 What's New in v2.2.0

- **🔧 FIXED**: Course creation "page not found" error (missing `account_id` parameter)
- **👨‍💼 Account Management**: Complete account-level administration tools
- **📊 Reports & Analytics**: Generate and access Canvas account reports  
- **👥 User Management**: Create and manage users at the account level
- **🏢 Multi-Account Support**: Handle account hierarchies and sub-accounts
- **✅ API Compliance**: All endpoints now follow proper Canvas API patterns

## 🎯 Key Features

### 🎓 For Students
- **Course Management**: Access all courses, syllabi, and course materials
- **Assignment Workflow**: View, submit (text/URL/files), and track assignments
- **Communication**: Participate in discussions, read announcements, send messages
- **Progress Tracking**: Monitor grades, module completion, and calendar events
- **Quizzes**: Take quizzes, view results and feedback
- **File Access**: Browse and download course files and resources

### 👨‍🏫 For Instructors
- **Course Creation**: Create and manage course structure *(now with proper account support)*
- **Grading**: Grade submissions, provide feedback, manage rubrics
- **User Management**: Enroll students, manage permissions
- **Content Management**: Create assignments, quizzes, discussions

### 👨‍💼 For Account Administrators (NEW!)
- **Account Management**: Manage institutional Canvas accounts
- **User Administration**: Create and manage users across accounts
- **Course Oversight**: List and manage all courses within accounts
- **Reporting**: Generate enrollment, grade, and activity reports
- **Sub-Account Management**: Handle account hierarchies and structures

### 🛠️ Technical Excellence
- **Robust API**: Automatic retries, pagination, comprehensive error handling
- **Cloud Ready**: Docker containers, Kubernetes manifests, health checks
- **Well Tested**: Unit tests, integration tests, mocking, coverage reports
- **Type Safe**: Full TypeScript implementation with strict types
- **50+ Tools**: Comprehensive coverage of Canvas LMS functionality

## Quick Start

### Option 1: Claude Desktop Integration (Recommended MCP Setup)

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "canvas-mcp-server": {
      "command": "npx",
      "args": ["-y", "canvas-mcp-server"],
      "env": {
        "CANVAS_API_TOKEN": "your_token_here",
        "CANVAS_DOMAIN": "your_school.instructure.com"
      }
    }
  }
}
```

### Option 2: NPM Package

```bash
# Install globally
npm install -g canvas-mcp-server

# Configure
export CANVAS_API_TOKEN="your_token_here"
export CANVAS_DOMAIN="your_school.instructure.com"

# Run
canvas-mcp-server
```

### Option 3: Docker

```bash
docker run -d \
  --name canvas-mcp \
  -e CANVAS_API_TOKEN="your_token" \
  -e CANVAS_DOMAIN="school.instructure.com" \
  ghcr.io/dmontgomery40/mcp-canvas-lms:latest
```

## 🌐 HTTP REST API Mode (NEW!)

The Canvas MCP Server now supports **HTTP mode** for direct REST API access with auto-generated Swagger documentation!

### Quick Start - HTTP Mode

#### Local Development
```bash
# Install dependencies
npm install

# Build
npm run build

# Start HTTP server (default port 8000)
npm run start:http

# Or specify custom port
node build/index.js --mode http --port 3000
```

#### Docker Compose (Recommended for Dokploy)
```bash
# Clone the repository
git clone https://github.com/dennisimoo/mcp-canvas-lms.git
cd mcp-canvas-lms

# Create .env file
cp .env.example .env
# Edit .env and add your CANVAS_API_TOKEN and CANVAS_DOMAIN

# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

The HTTP server will be available at:
- **API Base**: `http://localhost:8000/api`
- **Swagger Docs**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/api/health`

### HTTP API Endpoints

The REST API provides comprehensive Canvas LMS access:

#### Courses
- `GET /api/courses` - List all courses
- `GET /api/courses/:id` - Get course details
- `POST /api/courses` - Create new course
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course

#### Assignments
- `GET /api/courses/:courseId/assignments` - List assignments
- `POST /api/courses/:courseId/assignments` - Create assignment
- `GET /api/courses/:courseId/assignments/:id` - Get assignment
- `PUT /api/courses/:courseId/assignments/:id` - Update assignment
- `DELETE /api/courses/:courseId/assignments/:id` - Delete assignment

#### Submissions & Grading
- `GET /api/courses/:courseId/assignments/:assignmentId/submissions` - List submissions
- `POST /api/courses/:courseId/assignments/:assignmentId/submissions` - Submit assignment
- `POST /api/courses/:courseId/assignments/:assignmentId/submissions/:userId/grade` - Grade submission

#### Modules
- `GET /api/courses/:courseId/modules` - List modules
- `GET /api/courses/:courseId/modules/:moduleId/items` - List module items
- `POST /api/courses/:courseId/modules/:moduleId/items/:itemId/complete` - Mark item complete

#### Discussions
- `GET /api/courses/:courseId/discussions` - List discussion topics
- `POST /api/courses/:courseId/discussions/:topicId/entries` - Post to discussion

#### Quizzes
- `GET /api/courses/:courseId/quizzes` - List quizzes
- `POST /api/courses/:courseId/quizzes` - Create quiz
- `POST /api/courses/:courseId/quizzes/:quizId/start` - Start quiz attempt

#### User & Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile
- `GET /api/courses/:courseId/users` - List course users
- `POST /api/courses/:courseId/enrollments` - Enroll user

#### Grades
- `GET /api/grades` - Get all grades
- `GET /api/courses/:courseId/grades` - Get course grades

#### Dashboard
- `GET /api/dashboard` - Get dashboard
- `GET /api/dashboard/cards` - Get dashboard cards

#### Files & Folders
- `GET /api/courses/:courseId/files` - List files
- `GET /api/files/:fileId` - Get file details
- `GET /api/courses/:courseId/folders` - List folders

#### Account Administration
- `GET /api/accounts/:accountId` - Get account details
- `GET /api/accounts/:accountId/courses` - List account courses
- `GET /api/accounts/:accountId/users` - List account users
- `POST /api/accounts/:accountId/users` - Create user

### Example HTTP Requests

```bash
# Check API health
curl http://localhost:8000/api/health

# List all courses
curl http://localhost:8000/api/courses

# Get specific course
curl http://localhost:8000/api/courses/12345

# Create a course
curl -X POST http://localhost:8000/api/courses \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": 1,
    "name": "Introduction to Computer Science",
    "course_code": "CS101"
  }'

# List assignments for a course
curl http://localhost:8000/api/courses/12345/assignments

# Get user profile
curl http://localhost:8000/api/profile

# Get dashboard
curl http://localhost:8000/api/dashboard
```

### Deploying to Dokploy

1. **Create a new Compose app in Dokploy**
2. **Configure Git Repository**:
   - Provider: GitHub
   - Repository: `https://github.com/dennisimoo/mcp-canvas-lms`
   - Branch: `main`
   - Compose Path: `./docker-compose.yml`

3. **Set Environment Variables** in Dokploy:
   ```
   CANVAS_API_TOKEN=your_canvas_api_token_here
   CANVAS_DOMAIN=your_domain.instructure.com
   SERVER_MODE=http
   HTTP_PORT=8000
   NODE_ENV=production
   ```

4. **Configure Domain** (optional):
   - Add your custom domain in Dokploy
   - Point to port 8000

5. **Deploy**:
   - Click "Deploy" in Dokploy
   - Monitor logs for: `✅ MCP HTTP server running at http://localhost:8000`

### Environment Variables

```bash
# Required
CANVAS_API_TOKEN=your_canvas_api_token_here
CANVAS_DOMAIN=your_domain.instructure.com

# HTTP Mode Configuration
SERVER_MODE=http              # 'stdio' for MCP mode, 'http' for REST API
HTTP_PORT=8000                # HTTP server port (default: 8000)

# Optional
NODE_ENV=production           # Environment mode
LOG_LEVEL=info                # Logging level
CANVAS_MAX_RETRIES=3          # API retry attempts
CANVAS_RETRY_DELAY=1000       # Retry delay in ms
CANVAS_TIMEOUT=30000          # Request timeout in ms
```

### CLI Arguments

```bash
# Show help
node build/index.js --help

# Run in stdio mode (default - for AI tools like Claude Desktop)
node build/index.js

# Run in HTTP mode on default port (8000)
node build/index.js --mode http

# Run in HTTP mode on custom port
node build/index.js --mode http --port 3000
```

## 💼 Account Admin Workflow Examples

### Create a New Course (FIXED!)
```
"Create a new course called 'Advanced Biology' in account 123"
```
**Now properly creates courses with required account_id parameter**

### Manage Users
```
"Create a new student user John Doe with email john.doe@school.edu in our main account"
```
**Creates user accounts with proper pseudonym and enrollment setup**

### Generate Reports
```
"Generate an enrollment report for account 456 for the current term"
```
**Initiates Canvas reporting system for institutional analytics**

### List Account Courses
```
"Show me all published Computer Science courses in our Engineering account"
```
**Advanced filtering and searching across account course catalogs**

## 🎓 Student Workflow Examples

### Check Today's Assignments
```
"What assignments do I have due this week?"
```
**Lists upcoming assignments with due dates, points, and submission status**

### Submit an Assignment
```
"Help me submit my essay for English 101 Assignment 3"
```
**Guides through text submission with formatting options**

### Check Grades
```
"What's my current grade in Biology?"
```
**Shows current scores, grades, and assignment feedback**

### Participate in Discussions
```
"Show me the latest discussion posts in my Philosophy class"
```
**Displays recent discussion topics and enables posting responses**

### Track Progress
```
"What modules do I need to complete in Math 200?"
```
**Shows module completion status and next items to complete**

## Getting Canvas API Token

1. **Log into Canvas** → Account → Settings
2. **Scroll to "Approved Integrations"**
3. **Click "+ New Access Token"**
4. **Enter description**: "Claude MCP Integration"
5. **Copy the generated token** Save securely!

⚠️ **Account Admin Note**: For account-level operations, ensure your API token has administrative privileges.

## Production Deployment

### Docker Compose
```bash
git clone https://github.com/DMontgomery40/mcp-canvas-lms.git
cd mcp-canvas-lms
cp .env.example .env
# Edit .env with your Canvas credentials
docker-compose up -d
```

### Kubernetes
```bash
kubectl create secret generic canvas-mcp-secrets \
  --from-literal=CANVAS_API_TOKEN="your_token" \
  --from-literal=CANVAS_DOMAIN="school.instructure.com"

kubectl apply -f k8s/
```

### Health Monitoring
```bash
# Check application health
curl http://localhost:3000/health

# Or use the built-in health check
npm run health-check
```

## Development

```bash
# Setup development environment
git clone https://github.com/DMontgomery40/mcp-canvas-lms.git
cd mcp-canvas-lms
npm install

# Start development with hot reload
npm run dev:watch

# Run tests
npm run test
npm run coverage

# Code quality
npm run lint
npm run type-check
```

## 📚 Available Tools (50+ Tools)

<details>
<summary><strong>🎓 Core Student Tools (Click to expand)</strong></summary>

- `canvas_health_check` - Check API connectivity
- `canvas_list_courses` - List all your courses
- `canvas_get_course` - Get detailed course info
- `canvas_list_assignments` - List course assignments
- `canvas_get_assignment` - Get assignment details
- `canvas_submit_assignment` - Submit assignment work
- `canvas_get_submission` - Check submission status
- `canvas_list_modules` - List course modules
- `canvas_get_module` - Get module details
- `canvas_list_module_items` - List items in a module
- `canvas_mark_module_item_complete` - Mark items complete
- `canvas_list_discussion_topics` - List discussion topics
- `canvas_get_discussion_topic` - Get discussion details
- `canvas_post_to_discussion` - Post to discussions
- `canvas_list_announcements` - List course announcements
- `canvas_get_user_grades` - Get your grades
- `canvas_get_course_grades` - Get course-specific grades
- `canvas_get_dashboard` - Get dashboard info
- `canvas_get_dashboard_cards` - Get course cards
- `canvas_get_upcoming_assignments` - Get due dates
- `canvas_list_calendar_events` - List calendar events
- `canvas_list_files` - List course files
- `canvas_get_file` - Get file details
- `canvas_list_folders` - List course folders
- `canvas_list_pages` - List course pages
- `canvas_get_page` - Get page content
- `canvas_list_conversations` - List messages
- `canvas_get_conversation` - Get conversation details
- `canvas_create_conversation` - Send messages
- `canvas_list_notifications` - List notifications
- `canvas_get_syllabus` - Get course syllabus
- `canvas_get_user_profile` - Get user profile
- `canvas_update_user_profile` - Update profile

</details>

<details>
<summary><strong>👨‍🏫 Instructor Tools (Click to expand)</strong></summary>

- `canvas_create_course` - Create new courses *(FIXED: now requires account_id)*
- `canvas_update_course` - Update course settings
- `canvas_create_assignment` - Create assignments
- `canvas_update_assignment` - Update assignments
- `canvas_list_assignment_groups` - List assignment groups
- `canvas_submit_grade` - Grade submissions
- `canvas_enroll_user` - Enroll students
- `canvas_list_quizzes` - List course quizzes
- `canvas_get_quiz` - Get quiz details
- `canvas_create_quiz` - Create quizzes
- `canvas_start_quiz_attempt` - Start quiz attempts
- `canvas_list_rubrics` - List course rubrics
- `canvas_get_rubric` - Get rubric details

</details>

<details>
<summary><strong>👨‍💼 Account Management Tools (NEW!)</strong></summary>

- `canvas_get_account` - Get account details
- `canvas_list_account_courses` - List courses in an account
- `canvas_list_account_users` - List users in an account  
- `canvas_create_user` - Create new users in accounts
- `canvas_list_sub_accounts` - List sub-accounts
- `canvas_get_account_reports` - List available reports
- `canvas_create_account_report` - Generate account reports

</details>

## 🔧 Breaking Changes in v2.2.0

### Course Creation Fix
**BEFORE (Broken):**
```javascript
{
  "tool": "canvas_create_course",
  "arguments": {
    "name": "My Course"  // ❌ Missing account_id - caused "page not found"
  }
}
```

**AFTER (Fixed):**
```javascript
{
  "tool": "canvas_create_course", 
  "arguments": {
    "account_id": 123,              // ✅ Required account_id
    "name": "My Course",
    "course_code": "CS-101"
  }
}
```

## 🌟 Example Claude Conversations

**Student**: *"I need to check my upcoming assignments and submit my English essay"*

**Claude**: *I'll help you check your upcoming assignments and then assist with submitting your English essay. Let me start by getting your upcoming assignments...*

[Claude uses `canvas_get_upcoming_assignments` then helps with `canvas_submit_assignment`]

---

**Instructor**: *"Create a new Advanced Physics course in the Science department and enroll my teaching assistant"*

**Claude**: *I'll help you create the Advanced Physics course in your Science department account and then enroll your TA...*

[Claude uses `canvas_create_course` with proper account_id, then `canvas_enroll_user`]

---

**Administrator**: *"Generate an enrollment report for all Computer Science courses this semester"*

**Claude**: *I'll generate a comprehensive enrollment report for your CS courses...*

[Claude uses `canvas_list_account_courses` with filters, then `canvas_create_account_report`]

## 🔍 Troubleshooting

**Common Issues:**
- ❌ **401 Unauthorized**: Check your API token and permissions
- ❌ **404 Not Found**: Verify course/assignment IDs and access rights  
- ❌ **"Page not found" on course creation**: Update to v2.2.0 for account_id fix
- ❌ **Timeout**: Increase `CANVAS_TIMEOUT` or check network connectivity

**Debug Mode:**
```bash
export LOG_LEVEL=debug
npm start
```

**Health Check:**
```bash
npm run health-check
```

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Contribution Setup
```bash
git clone https://github.com/DMontgomery40/mcp-canvas-lms.git
cd mcp-canvas-lms
npm install
npm run dev:watch
# Make changes, add tests, submit PR
```

## 📈 Roadmap

- **v2.3**: Enhanced reporting, bulk operations, advanced search
- **v2.4**: Mobile support, offline capability, analytics dashboard  
- **v3.0**: Multi-tenant, GraphQL API, AI-powered insights

## 🙋 Support & Community

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/DMontgomery40/mcp-canvas-lms/issues)
- 💬 **Questions**: [GitHub Discussions](https://github.com/DMontgomery40/mcp-canvas-lms/discussions)
- 📖 **Documentation**: [Wiki](https://github.com/DMontgomery40/mcp-canvas-lms/wiki)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

<div align="center">
  <strong>Canvas MCP Server v2.2.0</strong><br>
  <em>Empowering students, educators, and administrators with seamless Canvas integration</em><br><br>
  
  ⭐ **Star this repo if it helps you!** ⭐
</div>
