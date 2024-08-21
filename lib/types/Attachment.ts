export interface Attachment {
  content: string;
  contentType: string;
  filename: string;
  contentDisposition: "attachment" | "inline";
  cid?: string;
}

export interface SendgridAttachment {
  content: string;
  type: string;
  filename: string;
  disposition: "attachment" | "inline";
  content_id?: string;
}
