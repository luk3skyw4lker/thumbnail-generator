import { escapeAttribute } from './sanitizer';
import { marked } from 'marked';

export interface ThumbnailTemplateArgs {
	thumbnail_bg: string;
	images: string[];
	fontSize: number;
	title: string;
	logoHeight: number;
	logoWidth: number | 'auto';
}

const getImage = (
	image: string,
	logoHeight: number,
	logoWidth: number | 'auto'
) => {
	const resolvedWidth = logoWidth === 'auto' ? logoHeight : logoWidth;

	return `<img
      class="logo"
      alt=""
      src="${escapeAttribute(image)}"
      width="${resolvedWidth}"
      height="${logoHeight}"
    />`;
};

function getPlusSign(i: number) {
	return i === 0 ? '' : '<div class="plus">+</div>';
}

export function getThumbnailTemplate({
	title,
	thumbnail_bg,
	images,
	fontSize,
	logoHeight,
	logoWidth
}: ThumbnailTemplateArgs) {
	const renderedTitle = marked.parse(title, { async: false }) as string;
	const resolvedWidth = logoWidth === 'auto' ? logoHeight : logoWidth;

	return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Thumbnail</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; }

      html, body {
        margin: 0;
        padding: 0;
        width: 1200px;
        height: 630px;
        overflow: hidden;
      }

      body {
        background: ${escapeAttribute(thumbnail_bg)};
        background-image: radial-gradient(circle at 25px 25px, lightgray 2%, transparent 0%), radial-gradient(circle at 75px 75px, lightgray 2%, transparent 0%);
        background-size: 100px 100px;
        position: relative;
      }

      .content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 20px;
        width: 1000px;
        text-align: center;
      }

      .logo-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 24px;
      }

      .logo {
        display: block;
        width: ${resolvedWidth}px !important;
        height: ${logoHeight}px !important;
        object-fit: contain;
        flex-shrink: 0;
      }

      .plus {
        color: #bbb;
        font-family: Times New Roman, Verdana, serif;
        font-size: 48px;
        line-height: 1;
      }

      .heading {
        font-family: 'Inter', sans-serif;
        font-size: ${fontSize}px;
        font-weight: 700;
        color: #fff;
        line-height: 1.35;
        letter-spacing: -0.02em;
        width: 100%;
      }

      .heading > * {
        margin: 0;
        padding: 0;
      }

      .heading strong {
        font-weight: 800;
      }
    </style>
  </head>
  <body>
    <div class="content">
      ${
				images.length === 0
					? ''
					: `<div class="logo-wrapper">${images
							.map(
								(img, i) =>
									getPlusSign(i) + getImage(img, logoHeight, logoWidth)
							)
							.join('')}</div>`
			}
      <div class="heading">${renderedTitle}</div>
    </div>
  </body>
  </html>`;
}
