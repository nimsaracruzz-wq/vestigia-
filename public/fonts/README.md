# Invoice font

`NotoSansJP.ttf` is a static weight-400 instance of the Google Fonts Noto Sans JP font.
It is embedded in downloadable invoices and packing slips to render Japanese and
accented Latin text, including mixed-language names, addresses, and product descriptions.
It is fetched on demand and cached between downloads, rather than loaded for page rendering.

Source: https://github.com/google/fonts/tree/main/ofl/notosansjp
License: `OFL-NotoSansJP.txt` (SIL Open Font License).
The static instance was generated with fontTools' `instantiateVariableFont`.
The regular face is used for both PDF styles; headings are distinguished by size.
This font does not cover every writing system or emoji.
