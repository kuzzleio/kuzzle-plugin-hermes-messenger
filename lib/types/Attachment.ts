export interface Attachment {
  content: string;
  contentType: string;
  filename: string;
  contentDisposition: "attachment" | "inline";
  cid?: string;
}
