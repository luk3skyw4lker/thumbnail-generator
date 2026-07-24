import { sanitizeHtml } from './sanitizer';
import { marked } from 'marked';

export interface ThumbnailTemplateArgs {
	thumbnail_bg: string;
	images: string[];
	fontSize: number;
	title: string;
	logoHeight: number;
	logoWidth: number | 'auto';
}

// marked v15 — keep sync parse like the old marked(title) call
marked.setOptions({
	async: false,
	gfm: true,
	breaks: false
});

const getImage = (
	image: string,
	logoHeight: number,
	logoWidth: number | 'auto'
) => {
	const widthAttr = logoWidth === 'auto' ? 'auto' : String(logoWidth);

	return `<img
      class="logo"
      alt="Generated Image"
      src="${sanitizeHtml(image)}"
      width="${widthAttr}"
      height="${logoHeight}"
  />`;
};

function getPlusSign(i: number) {
	return i === 0 ? '' : '<div class="plus">+</div>';
}

/**
 * Layout/CSS restored from the original thumb_template.ts.
 * logoHeight / logoWidth are the only additions (old hard-coded 225 / auto).
 */
export function getThumbnailTemplate({
	title,
	thumbnail_bg,
	images,
	fontSize,
	logoHeight,
	logoWidth
}: ThumbnailTemplateArgs) {
	const renderedTitle = marked.parse(title, { async: false }) as string;

	return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thumbnail</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
      body {
        background: ${thumbnail_bg};
        background-image: radial-gradient(circle at 25px 25px, lightgray 2%, transparent 0%), radial-gradient(circle at 75px 75px, lightgray 2%, transparent 0%);
        background-size: 100px 100px;
        height: 100vh;
        display: flex;
        text-align: center;
        align-items: center;
        justify-content: center;
      }

      svg {
        height: 40px;
        margin-top: 80px;
      }

      h1 {
        font-size: 62px;
        line-height: 80px;
        max-width: 80%;
      }

      .plus {
        color: #BBB;
        font-family: Times New Roman, Verdana;
        font-size: 100px;
      }

      .logo-wrapper {
        display: flex;
        align-items: center;
        align-content: center;
        justify-content: center;
        justify-items: center;
      }

      .logo {
        margin: 0 75px;
      }

      .spacer {
        margin: 150px;
      }

      .heading {
        font-style: normal;
        font-family: 'Inter', sans-serif;
        font-size: ${fontSize}px;
        font-weight: 400;
        color: #fff;
        line-height: 1.8;
      }

      .heading > * {
        margin: 0;
      }

      .heading strong,
      .heading b {
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <div>
      <div class="spacer">
      <div class="logo-wrapper">
         ${
						images.length === 0
							? ''
							: images
									.map(
										(img, i) =>
											getPlusSign(i) + getImage(img, logoHeight, logoWidth)
									)
									.join('')
					}
      </div>
      <div class="spacer">
      <div class="heading">
        ${renderedTitle}
      </div>
    </div>
  </body>
  </html>`;
}
