import { Node, mergeAttributes } from '@tiptap/core';

export function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
    }
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : url;
    }
    return url;
  } catch {
    return url;
  }
}

const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-video-embed]',
        getAttrs: (element: HTMLElement) => ({
          src: element.querySelector('iframe')?.getAttribute('src') || '',
        }),
      },
    ];
  },

  renderHTML({ node }) {
    return [
      'div',
      mergeAttributes({ 'data-video-embed': 'true', class: 'proposal-video-embed' }),
      ['iframe', { src: node.attrs.src, frameborder: '0', allowfullscreen: 'true' }],
    ];
  },
});

export default VideoEmbed;
