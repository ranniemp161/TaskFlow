# Local user, project, and task workflow

Run the API from `backend` with `npm run start:dev`. It uses `DATABASE_URL` from your local environment and listens on port 3000 unless `PORT` is set. Use your Neon development branch.

These endpoints create application records; they do not implement signup, login, or ownership authorization.

In a separate Windows PowerShell window, run the following steps one at a time. Each POST writes a record to the configured database. Use a different email if you already created this example user.

```powershell
$taskFlowApi = 'http://localhost:3000'
$taskFlowOwner = Invoke-RestMethod -Method Post -Uri "$taskFlowApi/users" -ContentType 'application/json' -Body (@{ name = 'Rannie'; email = 'rannie@example.com' } | ConvertTo-Json)
$taskFlowOwner
```

```powershell
$taskFlowProject = Invoke-RestMethod -Method Post -Uri "$taskFlowApi/projects" -ContentType 'application/json' -Body (@{ name = 'TaskFlow learning'; ownerId = $taskFlowOwner.id } | ConvertTo-Json)
$taskFlowProject
```

```powershell
$taskFlowTask = Invoke-RestMethod -Method Post -Uri "$taskFlowApi/tasks" -ContentType 'application/json' -Body (@{ title = 'Verify my first task'; projectId = $taskFlowProject.id; assigneeId = $taskFlowOwner.id } | ConvertTo-Json)
$taskFlowTask
```

To find existing owners and projects:

```powershell
Invoke-RestMethod -Uri "$taskFlowApi/users?page=1&limit=20"
Invoke-RestMethod -Uri "$taskFlowApi/projects?ownerId=$($taskFlowOwner.id)&page=1&limit=20"
```

List responses are arrays. Both endpoints default to page 1 and 20 records, with a maximum limit of 100. Projects optionally accept an `ownerId` filter. Duplicate user emails return 409; nonexistent project owners and invalid request fields return 400. Email whitespace is trimmed; case is preserved to match the existing database uniqueness rule.
