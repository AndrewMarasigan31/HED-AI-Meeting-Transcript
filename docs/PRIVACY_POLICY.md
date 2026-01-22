# Privacy Policy for Meeting Notes Automation

**Last Updated: January 22, 2026**

## Overview

Meeting Notes Automation ("the Application") is an internal tool that automatically creates Gmail draft emails containing formatted meeting notes. This privacy policy explains how the Application handles data.

## Information We Access

The Application accesses:
- **Gmail Account**: To create draft emails in your Gmail account
- **Meeting Data**: Meeting transcripts and metadata from Attio CRM
- **Email Formatting Preferences**: Recipients and signature information for draft emails

## How We Use Your Information

The Application uses your information solely to:
1. Retrieve meeting transcripts from Attio CRM
2. Format meeting notes using Claude AI
3. Create draft emails in your Gmail account
4. Support multi-account draft creation when configured

## Data Storage and Retention

- **OAuth Tokens**: Stored securely in AWS S3 for authentication purposes only
- **Meeting Data**: Processed in real-time during Lambda execution and not persisted
- **Email Drafts**: Created directly in your Gmail account; not stored by the Application
- **Logs**: AWS CloudWatch logs may temporarily contain processing information for debugging

## Data Sharing

We do NOT:
- Share your data with third parties
- Sell your information
- Use your data for marketing purposes
- Store email content beyond processing time

## Third-Party Services

The Application integrates with:
- **Google Gmail API**: For creating draft emails
- **Attio CRM**: For retrieving meeting data
- **Anthropic Claude AI**: For formatting meeting notes
- **AWS Services**: For hosting and processing (Lambda, S3, CloudWatch)

Each service has its own privacy policy and data handling practices.

## Data Security

- OAuth tokens are stored encrypted in AWS S3
- All API communications use HTTPS/TLS encryption
- Access is restricted to authorized accounts only
- AWS Lambda functions operate in isolated execution environments

## Your Rights

You have the right to:
- Revoke Gmail access at any time via Google Account settings
- Request deletion of stored OAuth tokens
- Access logs of Application activity (subject to retention policies)

## Google API Services User Data Policy

This Application's use of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

The Application:
- Only accesses Gmail to create drafts (limited scope: gmail.compose)
- Does not transfer Gmail data to third parties except as required for core functionality
- Does not use Gmail data for advertising purposes
- Does not allow humans to read Gmail data except as necessary for security, compliance, or with user consent

## Changes to This Policy

We may update this privacy policy from time to time. The "Last Updated" date at the top indicates when the policy was last revised.

## Contact

For questions about this privacy policy or data handling practices, please contact:

**Email**: [Your Contact Email]

---

## Technical Details

**Application Scope**:
- Gmail API: `https://www.googleapis.com/auth/gmail.compose` (create drafts only)

**Data Flow**:
1. Attio webhook triggers Lambda function
2. Lambda retrieves meeting data from Attio
3. Claude AI formats the content
4. Draft created in Gmail via OAuth
5. Processing complete, no data persisted

**Hosting**: AWS Lambda (ap-southeast-1 region)
