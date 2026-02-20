const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, pageId, content, type, url } = req.body;

  const headers = {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28'
  };

  try {
    // Action: find today's page
    if (action === 'findPage') {
      const { title } = req.body;

      // First, get database schema to find the title property name
      const dbResponse = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}`, {
        method: 'GET',
        headers
      });
      const dbData = await dbResponse.json();

      if (dbData.error) {
        return res.status(400).json({ error: dbData.error, message: dbData.message });
      }

      // Find the title property name
      let titlePropertyName = 'Name';
      for (const [propName, propValue] of Object.entries(dbData.properties || {})) {
        if (propValue.type === 'title') {
          titlePropertyName = propName;
          break;
        }
      }

      const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filter: {
            property: titlePropertyName,
            title: { equals: title }
          },
          page_size: 1
        })
      });

      const data = await response.json();

      if (data.error) {
        return res.status(400).json({ error: data.error, message: data.message });
      }

      if (data.results && data.results.length > 0) {
        return res.status(200).json({ pageId: data.results[0].id });
      }
      return res.status(200).json({ pageId: null });
    }

    // Action: create today's page
    if (action === 'createPage') {
      const { title } = req.body;

      // First, get database schema to find the title property name
      const dbResponse = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}`, {
        method: 'GET',
        headers
      });
      const dbData = await dbResponse.json();

      if (dbData.error) {
        return res.status(400).json({ error: dbData.error, message: dbData.message });
      }

      // Find the title property name
      let titlePropertyName = 'Name';
      for (const [propName, propValue] of Object.entries(dbData.properties || {})) {
        if (propValue.type === 'title') {
          titlePropertyName = propName;
          break;
        }
      }

      const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          parent: { database_id: DATABASE_ID },
          properties: {
            [titlePropertyName]: {
              title: [{ text: { content: title } }]
            }
          }
        })
      });

      const data = await response.json();

      if (data.error) {
        return res.status(400).json({ error: data.error, message: data.message });
      }

      return res.status(200).json({ pageId: data.id });
    }

    // Action: append content to page
    if (action === 'appendContent') {
      if (!pageId) {
        return res.status(400).json({ success: false, error: { message: 'pageId is required' } });
      }

      let blocks = [];

      if (type === 'link' && url) {
        blocks.push({
          object: 'block',
          type: 'bookmark',
          bookmark: {
            url: url,
            caption: content ? [{ type: 'text', text: { content: content } }] : []
          }
        });
      } else {
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: content } }]
          }
        });
      }

      const response = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ children: blocks })
      });

      if (response.ok) {
        return res.status(200).json({ success: true });
      } else {
        const error = await response.json();
        return res.status(400).json({ success: false, error });
      }
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (error) {
    console.error('Notion API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
