type LegalPage = 'privacy' | 'terms';

const UPDATED_AT = 'May 9, 2026';

const pageCopy: Record<LegalPage, { title: string; subtitle: string; sections: Array<{ heading: string; body: string }> }> = {
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'How Zoon handles collaborative documents and tokenized sharing links.',
    sections: [
      {
        heading: 'Documents and sharing links',
        body:
          'Zoon stores the markdown documents you create, plus document metadata needed to open, edit, and synchronize those documents. A document URL with a token grants access to that document. Treat tokenized URLs like private collaboration links.',
      },
      {
        heading: 'Agent access',
        body:
          'When you share a Zoon URL with an AI agent such as Codex, the agent can use the token in that URL to read or write the document over HTTP. Zoon records agent-authored writes with an ai-prefixed author label when the agent uses the documented API.',
      },
      {
        heading: 'Account and local data',
        body:
          'If you create or sign in to a Zoon account, Zoon stores the account information needed to provide document library and authentication features. Local browser storage may be used for recent documents and editor state.',
      },
      {
        heading: 'Contact',
        body:
          'For privacy questions or deletion requests, contact the project maintainer through the Zoon GitHub repository.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    subtitle: 'Basic terms for using Zoon documents and agent collaboration features.',
    sections: [
      {
        heading: 'Use of Zoon',
        body:
          'Zoon is provided for collaborative writing between humans and agents. You are responsible for the content you create, share, or ask an agent to write into a document.',
      },
      {
        heading: 'Tokenized URLs',
        body:
          'Anyone with a valid tokenized document URL may be able to access or modify that document according to the token permissions. Share these links only with people and agents you trust.',
      },
      {
        heading: 'No sensitive-data guarantee',
        body:
          'Do not put passwords, API keys, financial secrets, medical records, or other highly sensitive information into Zoon unless you have independently verified that the deployment and access controls meet your requirements.',
      },
      {
        heading: 'Availability',
        body:
          'Zoon is offered as-is. Features, APIs, and availability may change as the product evolves.',
      },
    ],
  },
};

function renderSection(heading: string, body: string): string {
  return `<section><h2>${heading}</h2><p>${body}</p></section>`;
}

export function renderLegalPage(page: LegalPage): string {
  const copy = pageCopy[page];
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${copy.title} - Zoon</title>
  <style>
    :root { color-scheme: light; --bg: #f4f0e7; --paper: #fcfaf2; --ink: #1a1913; --muted: #716c5f; --line: #d8cfb8; --accent: #4a5d3a; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--ink); line-height: 1.6; }
    main { max-width: 820px; margin: 0 auto; padding: 56px 24px 72px; }
    a { color: var(--accent); text-decoration-thickness: 2px; text-underline-offset: 3px; }
    .back { display: inline-flex; margin-bottom: 40px; font-weight: 700; }
    .eyebrow { color: var(--muted); font-size: 13px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 10px 0 12px; font-size: clamp(40px, 7vw, 72px); line-height: .95; letter-spacing: 0; }
    .subtitle { max-width: 680px; margin: 0 0 12px; color: var(--muted); font-size: 20px; }
    .updated { margin: 0 0 42px; color: var(--muted); font-size: 14px; }
    section { padding: 26px 0; border-top: 1px solid var(--line); }
    h2 { margin: 0 0 10px; font-size: 22px; }
    p { margin: 0; font-size: 17px; }
  </style>
</head>
<body>
  <main>
    <a class="back" href="/">Back to Zoon</a>
    <div class="eyebrow">Zoon</div>
    <h1>${copy.title}</h1>
    <p class="subtitle">${copy.subtitle}</p>
    <p class="updated">Last updated: ${UPDATED_AT}</p>
    ${copy.sections.map((section) => renderSection(section.heading, section.body)).join('\n    ')}
  </main>
</body>
</html>`;
}
