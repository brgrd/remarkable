(function () {
	const sections = {
		badges: `<!-- Badges (optional) -->
![Build Status](https://img.shields.io/badge/build-{{buildStatus}}-brightgreen)
![Version](https://img.shields.io/badge/version-{{buildVersion}}-blue)
![License](https://img.shields.io/badge/license-{{licenseType}}-blue)

`,

		description: `## Description

{{projectDesc}}

**Highlights**
- 
- 
- 

`,

		quickstart: `## Quick Start

1. Clone:
   \`\`\`bash
   git clone https://github.com/{{username}}/{{projectName}}.git
   cd {{projectName}}
   \`\`\`

2. Install:
   \`\`\`bash
   # e.g. npm install / pnpm install / pip install -r requirements.txt
   install-command
   \`\`\`

3. Run:
   \`\`\`bash
   start-command
   \`\`\`

`,

		prerequisites: `## Prerequisites

- 
- 
- 

`,

		installation: `## Installation

### Install
\`\`\`bash
install-command
\`\`\`

`,

		configuration: `## Configuration

### Environment
Set required environment variables (example):

\`\`\`env
KEY=value
\`\`\`

`,

		usage: `## Usage

### Example
\`\`\`text
# Add a minimal, copy/pasteable example here.
\`\`\`

`,

		testing: `## Testing

\`\`\`bash
test-command
\`\`\`

`,

		api: `## API Documentation

### Base URL
{{apiUrl}}

### Authentication
- 

### Endpoints
- \`GET /...\` — 
- \`POST /...\` — 

`,

		troubleshooting: `## Troubleshooting

### Common Issues
- **Problem:** … **Fix:** …
- **Problem:** … **Fix:** …

`,

		deployment: `## Deployment

### Build
\`\`\`bash
build-command
\`\`\`

### Deploy
\`\`\`bash
deploy-command
\`\`\`

`,

		contributing: `## Contributing

### How to contribute
1. Fork and create a branch
2. Make changes (with tests if applicable)
3. Open a PR with context and screenshots/logs if relevant

`,

		security: `## Security

If you discover a security vulnerability, please email {{contactEmail}}. Do not open a public issue.

We will respond as soon as possible.

`,

		license: `## License

This project is licensed under the {{licenseType}} License - see the [LICENSE](LICENSE) file for details.

`,

		changelog: `## Changelog

### [Unreleased]
- 

### [{{buildVersion}}] - {{date}}
- 

`,

		quickPR: `# PR: {{prTitle}}

**Date:** {{date}}

## Overview
<!-- Brief description of what this PR accomplishes and why -->


## Key Changes

### Component/Module Updates
- 

### Dependency Updates
- 

### Configuration Changes
- 

### Database/Schema Changes
- 

## Testing
- [ ] Unit tests passing
- [ ] Integration tests passing  
- [ ] Cypress/E2E tests updated
- [ ] Manual testing complete
- [ ] Accessibility verified

## Deployment Notes
<!-- Any special deployment instructions, migrations, or rollout considerations -->


## Related
**Ticket:** {{ticketNumber}}

`
	};

	const templateOrder = [
		'quickPR', 'badges', 'description', 'quickstart', 'prerequisites', 'installation',
		'configuration', 'usage', 'testing', 'api', 'troubleshooting',
		'deployment', 'contributing', 'security', 'license', 'changelog'
	];

	window.TemplateData = { sections, templateOrder };
})();
