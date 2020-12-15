import { sanitizeHtml } from './sanitizer';

interface GetThumbnailTemplateArgs {
	thumbnail_bg: string;
	images: string[];
	fontSize: number;
	title: string;
}

const getImage = (image: string) => {
	return `<img
      class="logo"
      alt="Generated Image"
      src="${sanitizeHtml(image)}"
      width="auto"
      height="225"
  />`;
};

function getPlusSign(i: number) {
	return i === 0 ? '' : '<div class="plus">+</div>';
}

export default function getThumbnailTemplate({
	title,
	thumbnail_bg,
	images,
	fontSize
}: GetThumbnailTemplateArgs) {
	return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <title>Thumbnail</title>
  
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@700&display=swap" rel="stylesheet">
  
    <style>
      body {
        margin: 0;
        font-family: Roboto, sans-serif;
        color: #FFF;
        background: ${thumbnail_bg};
        background-image: 
          radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.2) 2%, transparent 0%), 
          radial-gradient(circle at 75px 75px, rgba(255, 255, 255, 0.2) 2%, transparent 0%);
        background-size: 100px 100px;
        height: 100vh;
      }
  
      #wrapper {
        width: 1920px;
        height: 1097px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
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

      .title {
        font-family: Verdana;
        font-size: ${fontSize}rem;
      }
    </style>
  </head>
  <body>
    <div id="wrapper">
      <div class="logo-wrapper">
         ${
						images.length === 0
							? ''
							: images.map((img, i) => getPlusSign(i) + getImage(img))
					}
      </div>

      <p class="title">${title}</p>
    </div>
  </body>
  </html>`;
}
