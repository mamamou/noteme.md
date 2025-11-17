/**
 * Utility functions for managing section markers in document content
 * These markers help track AI-generated vs manually written content
 */

// Marker format: <!-- AI-GENERATED: [timestamp] -->
const AI_MARKER_START = "<!-- AI-GENERATED-START:";
const AI_MARKER_END = "<!-- AI-GENERATED-END -->";

/**
 * Wraps content with AI-generated markers
 * @param {string} content - The content to wrap
 * @returns {string} - Content wrapped with markers
 */
export const wrapWithAIMarker = (content) => {
  const timestamp = new Date().toISOString();
  return `\n${AI_MARKER_START} ${timestamp} -->\n${content}\n${AI_MARKER_END}\n`;
};

/**
 * Checks if content contains AI markers
 * @param {string} content - The content to check
 * @returns {boolean}
 */
export const hasAIMarkers = (content) => {
  return content.includes(AI_MARKER_START);
};

/**
 * Extracts all AI-generated sections from content
 * @param {string} content - The full document content
 * @returns {Array} - Array of objects with section content and metadata
 */
export const extractAISections = (content) => {
  const sections = [];
  const regex = /<!-- AI-GENERATED-START: (.*?) -->\n([\s\S]*?)\n<!-- AI-GENERATED-END -->/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    sections.push({
      timestamp: match[1],
      content: match[2],
      fullMatch: match[0],
    });
  }

  return sections;
};

/**
 * Removes all AI markers from content (for export or clean view)
 * @param {string} content - The content with markers
 * @returns {string} - Clean content without markers
 */
export const removeAIMarkers = (content) => {
  return content
    .replace(/<!-- AI-GENERATED-START:.*? -->\n/g, "")
    .replace(/\n<!-- AI-GENERATED-END -->/g, "");
};

/**
 * Highlights AI-generated sections in the editor
 * This function can be used to add visual indicators in the preview mode
 * @param {string} content - The content to process
 * @returns {string} - Content with HTML spans for highlighting
 */
export const highlightAISections = (content) => {
  return content.replace(
    /<!-- AI-GENERATED-START: (.*?) -->\n([\s\S]*?)\n<!-- AI-GENERATED-END -->/g,
    (match, timestamp, sectionContent) => {
      const date = new Date(timestamp).toLocaleString();
      return `<div class="ai-generated-section" data-timestamp="${timestamp}" title="AI-generated on ${date}">\n${sectionContent}\n</div>`;
    }
  );
};

/**
 * Get statistics about AI-generated content
 * @param {string} content - The document content
 * @returns {object} - Statistics object
 */
export const getAIContentStats = (content) => {
  const sections = extractAISections(content);
  const totalCharacters = content.length;
  const aiCharacters = sections.reduce((acc, section) => acc + section.content.length, 0);

  return {
    totalSections: sections.length,
    totalCharacters,
    aiCharacters,
    manualCharacters: totalCharacters - aiCharacters,
    aiPercentage: totalCharacters > 0 ? ((aiCharacters / totalCharacters) * 100).toFixed(1) : 0,
  };
};
