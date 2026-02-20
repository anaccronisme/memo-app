const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

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
          },
          children: [
            {
              object: 'block',
              type: 'heading_2',
              heading_2: {
                rich_text: [{ type: 'text', text: { content: 'Notes' } }]
              }
            },
            {
              object: 'block',
              type: 'heading_2',
              heading_2: {
                rich_text: [{ type: 'text', text: { content: 'Liens' } }]
              }
            },
            {
              object: 'block',
              type: 'heading_2',
              heading_2: {
                rich_text: [{ type: 'text', text: { content: 'Mémos Vocaux' } }]
              }
            },
            {
              object: 'block',
              type: 'heading_2',
              heading_2: {
                rich_text: [{ type: 'text', text: { content: 'Fichiers' } }]
              }
            }
          ]
        })
      });

      const data = await response.json();

      if (data.error) {
        return res.status(400).json({ error: data.error, message: data.message });
      }

      if (!data.id) {
        return res.status(400).json({ error: 'creation_failed', message: 'Page creation failed', details: data });
      }

      return res.status(200).json({ pageId: data.id });
    }

    // Action: append content to page
    if (action === 'appendContent') {
      if (!pageId) {
        return res.status(400).json({ success: false, error: { message: 'pageId is required' } });
      }

      // Get existing blocks to find the right section
      const blocksResponse = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
        method: 'GET',
        headers
      });
      const blocksData = await blocksResponse.json();

      // Find the section headers
      let sectionName = 'Notes';
      if (type === 'link') sectionName = 'Liens';
      else if (type === 'voice') sectionName = 'Mémos Vocaux';
      let sectionBlockId = null;

      if (blocksData.results) {
        for (const block of blocksData.results) {
          if (block.type === 'heading_2') {
            const text = block.heading_2.rich_text?.[0]?.plain_text || '';
            if (text === sectionName) {
              sectionBlockId = block.id;
              break;
            }
          }
        }
      }

      // Create the content block
      let newBlock;
      if (type === 'link' && url) {
        const linkText = content || url;
        newBlock = {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: linkText,
                  link: { url: url }
                }
              }
            ]
          }
        };
      } else {
        newBlock = {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: content } }]
          }
        };
      }

      // If section found, add after it; otherwise add at the end
      let response;
      if (sectionBlockId) {
        response = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            children: [newBlock],
            after: sectionBlockId
          })
        });
      } else {
        response = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ children: [newBlock] })
        });
      }

      if (response.ok) {
        return res.status(200).json({ success: true });
      } else {
        const error = await response.json();
        return res.status(400).json({ success: false, error });
      }
    }

    // Action: append image to page
    if (action === 'appendImage') {
      const { imageUrl, caption } = req.body;

      if (!pageId) {
        return res.status(400).json({ success: false, error: { message: 'pageId is required' } });
      }

      if (!imageUrl) {
        return res.status(400).json({ success: false, error: { message: 'imageUrl is required' } });
      }

      const imageBlock = {
        object: 'block',
        type: 'image',
        image: {
          type: 'external',
          external: { url: imageUrl },
          caption: caption ? [{ type: 'text', text: { content: caption } }] : []
        }
      };

      const response = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ children: [imageBlock] })
      });

      if (response.ok) {
        return res.status(200).json({ success: true });
      } else {
        const error = await response.json();
        return res.status(400).json({ success: false, error });
      }
    }

    // Action: upload image and add to page
    if (action === 'uploadImage') {
      const { title, imageData, filename } = req.body;

      if (!imageData) {
        return res.status(400).json({ success: false, error: { message: 'imageData is required' } });
      }

      if (!IMGBB_API_KEY) {
        return res.status(400).json({ success: false, error: { message: 'IMGBB_API_KEY not configured' } });
      }

      // Upload to imgbb
      const formData = new URLSearchParams();
      formData.append('key', IMGBB_API_KEY);
      formData.append('image', imageData);

      const imgbbResponse = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData
      });
      const imgbbData = await imgbbResponse.json();

      if (!imgbbData.success) {
        return res.status(400).json({ success: false, error: { message: 'Image upload failed' } });
      }

      const imageUrl = imgbbData.data.url;

      // Find or create today's page
      const dbResponse = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}`, {
        method: 'GET',
        headers
      });
      const dbData = await dbResponse.json();

      let titlePropertyName = 'Name';
      for (const [propName, propValue] of Object.entries(dbData.properties || {})) {
        if (propValue.type === 'title') {
          titlePropertyName = propName;
          break;
        }
      }

      // Find page
      const queryResponse = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filter: { property: titlePropertyName, title: { equals: title } },
          page_size: 1
        })
      });
      const queryData = await queryResponse.json();

      let pageId = queryData.results?.[0]?.id;

      // Create page if not exists
      if (!pageId) {
        const createResponse = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            parent: { database_id: DATABASE_ID },
            properties: {
              [titlePropertyName]: { title: [{ text: { content: title } }] }
            },
            children: [
              { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: 'Notes' } }] } },
              { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: 'Liens' } }] } },
              { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: 'Mémos Vocaux' } }] } },
              { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: 'Fichiers' } }] } }
            ]
          })
        });
        const createData = await createResponse.json();
        pageId = createData.id;
      }

      // Find "Fichiers" section
      const blocksResponse = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
        method: 'GET',
        headers
      });
      const blocksData = await blocksResponse.json();

      let sectionBlockId = null;
      if (blocksData.results) {
        for (const block of blocksData.results) {
          if (block.type === 'heading_2') {
            const text = block.heading_2.rich_text?.[0]?.plain_text || '';
            if (text === 'Fichiers') {
              sectionBlockId = block.id;
              break;
            }
          }
        }
      }

      // Add image to page
      const imageBlock = {
        object: 'block',
        type: 'image',
        image: {
          type: 'external',
          external: { url: imageUrl },
          caption: filename ? [{ type: 'text', text: { content: filename } }] : []
        }
      };

      let appendResponse;
      if (sectionBlockId) {
        appendResponse = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ children: [imageBlock], after: sectionBlockId })
        });
      } else {
        appendResponse = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ children: [imageBlock] })
        });
      }

      if (appendResponse.ok) {
        return res.status(200).json({ success: true, imageUrl });
      } else {
        const error = await appendResponse.json();
        return res.status(400).json({ success: false, error });
      }
    }

    // Action: get page content
    if (action === 'getContent') {
      if (!pageId) {
        return res.status(400).json({ error: 'pageId is required' });
      }

      const blocksResponse = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
        method: 'GET',
        headers
      });
      const blocksData = await blocksResponse.json();

      if (blocksData.error) {
        return res.status(400).json({ error: blocksData.error, message: blocksData.message });
      }

      // Check if sections exist
      const blocks = blocksData.results || [];
      const hasSections = blocks.some(b =>
        b.type === 'heading_2' &&
        ['Notes', 'Liens'].includes(b.heading_2.rich_text?.[0]?.plain_text)
      );

      // Parse blocks into notes and links
      const notes = [];
      const links = [];
      let currentSection = hasSections ? null : 'auto';

      for (const block of blocks) {
        if (block.type === 'heading_2') {
          const text = block.heading_2.rich_text?.[0]?.plain_text || '';
          if (text === 'Notes') currentSection = 'notes';
          else if (text === 'Liens') currentSection = 'links';
          else currentSection = hasSections ? null : 'auto';
        } else if (block.type === 'paragraph' && currentSection) {
          const richText = block.paragraph.rich_text || [];
          if (richText.length > 0) {
            const text = richText[0].plain_text || '';
            const link = richText[0].text?.link?.url || null;

            if (currentSection === 'auto') {
              // Auto-detect: if has link -> links, otherwise -> notes
              if (link) {
                links.push({ text, url: link });
              } else {
                notes.push({ text });
              }
            } else if (currentSection === 'notes') {
              notes.push({ text });
            } else if (currentSection === 'links') {
              links.push({ text, url: link });
            }
          }
        }
      }

      return res.status(200).json({ notes, links });
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (error) {
    console.error('Notion API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
