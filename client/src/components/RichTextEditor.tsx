import { useEditor, EditorContent, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import type { Editor } from "@tiptap/react";
import { useEffect, useCallback, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Undo,
  Redo,
  Quote,
  Minus,
  ImagePlus,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace(/['"]+/g, ""),
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

function parseAlignFromStyle(style: string | null): string | null {
  if (!style) return null;
  if (style.includes("margin-left: auto") && style.includes("margin-right: auto")) return "center";
  if (style.includes("margin-left: auto") && !style.includes("margin-right: auto")) return "right";
  return null;
}

function buildImageStyle(attrs: { width?: string; height?: string; align?: string }): string {
  const parts: string[] = [];
  if (attrs.width) parts.push(`width: ${attrs.width}`);
  if (attrs.height) parts.push(`height: ${attrs.height}`);
  if (attrs.align === "center") {
    parts.push("margin-left: auto", "margin-right: auto", "display: block");
  } else if (attrs.align === "right") {
    parts.push("margin-left: auto", "display: block");
  } else {
    parts.push("display: block");
  }
  return parts.join("; ");
}

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: {
        default: null,
        parseHTML: (element) => element.style.width || element.getAttribute("width") || null,
      },
      height: {
        default: null,
        parseHTML: (element) => element.style.height || element.getAttribute("height") || null,
      },
      align: {
        default: null,
        parseHTML: (element) => parseAlignFromStyle(element.getAttribute("style")),
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const { width, height, align, ...rest } = HTMLAttributes;
    return ["img", {
      ...rest,
      style: buildImageStyle({ width, height, align }),
    }];
  },
  addNodeView() {
    return ({ node, getPos, editor }) => {
      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.maxWidth = "100%";

      function applyContainerAlign(alignVal: string | null) {
        if (alignVal === "center") {
          container.style.marginLeft = "auto";
          container.style.marginRight = "auto";
          container.style.display = "block";
          container.style.textAlign = "center";
        } else if (alignVal === "right") {
          container.style.marginLeft = "auto";
          container.style.marginRight = "";
          container.style.display = "block";
          container.style.textAlign = "right";
        } else {
          container.style.marginLeft = "";
          container.style.marginRight = "";
          container.style.display = "block";
          container.style.textAlign = "left";
        }
      }

      applyContainerAlign(node.attrs.align);

      const img = document.createElement("img");
      img.src = node.attrs.src;
      img.alt = node.attrs.alt || "";
      img.className = "max-w-full h-auto rounded-md";
      img.style.cursor = "pointer";
      if (node.attrs.width) img.style.width = node.attrs.width;
      if (node.attrs.height) img.style.height = node.attrs.height;
      if (node.attrs.align === "center" || node.attrs.align === "right") {
        img.style.display = "inline-block";
      }

      const toolbar = document.createElement("div");
      toolbar.className = "image-toolbar";
      toolbar.style.cssText = "display:none; position:absolute; top:-36px; left:50%; transform:translateX(-50%); background:hsl(var(--card)); border:1px solid hsl(var(--border)); border-radius:6px; padding:2px 4px; gap:2px; z-index:50; white-space:nowrap; box-shadow:0 2px 8px rgba(0,0,0,0.3);";

      const sizes = [
        { label: "S", width: "25%" },
        { label: "M", width: "50%" },
        { label: "L", width: "75%" },
        { label: "Full", width: "100%" },
      ];

      const aligns = [
        { label: "Left", value: "left", icon: "\u21D0" },
        { label: "Center", value: "center", icon: "\u21D4" },
        { label: "Right", value: "right", icon: "\u21D2" },
      ];

      sizes.forEach(({ label, width }) => {
        const btn = document.createElement("button");
        btn.textContent = label;
        btn.type = "button";
        btn.style.cssText = "padding:2px 8px; font-size:11px; border-radius:4px; border:none; cursor:pointer; color:hsl(var(--foreground)); background:transparent;";
        btn.onmouseenter = () => { btn.style.background = "hsl(var(--accent))"; };
        btn.onmouseleave = () => { btn.style.background = "transparent"; };
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof getPos === "function") {
            editor.chain().focus().setNodeSelection((getPos as () => number)()).updateAttributes("image", { width, height: "auto" }).run();
          }
        };
        toolbar.appendChild(btn);
      });

      const sep = document.createElement("div");
      sep.style.cssText = "width:1px; height:16px; background:hsl(var(--border)); margin:0 2px; align-self:center;";
      toolbar.appendChild(sep);

      aligns.forEach(({ label, value, icon }) => {
        const btn = document.createElement("button");
        btn.textContent = icon;
        btn.title = label;
        btn.type = "button";
        btn.style.cssText = "padding:2px 6px; font-size:12px; border-radius:4px; border:none; cursor:pointer; color:hsl(var(--foreground)); background:transparent;";
        btn.onmouseenter = () => { btn.style.background = "hsl(var(--accent))"; };
        btn.onmouseleave = () => { btn.style.background = "transparent"; };
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof getPos === "function") {
            editor.chain().focus().setNodeSelection((getPos as () => number)()).updateAttributes("image", { align: value }).run();
          }
        };
        toolbar.appendChild(btn);
      });

      img.onclick = () => {
        toolbar.style.display = toolbar.style.display === "none" ? "flex" : "none";
      };

      const handleClickOutside = (e: MouseEvent) => {
        if (!container.contains(e.target as Node)) {
          toolbar.style.display = "none";
        }
      };
      document.addEventListener("click", handleClickOutside);

      container.appendChild(toolbar);
      container.appendChild(img);

      return {
        dom: container,
        destroy() {
          document.removeEventListener("click", handleClickOutside);
        },
        update(updatedNode) {
          if (updatedNode.type.name !== "image") return false;
          img.src = updatedNode.attrs.src;
          img.style.width = updatedNode.attrs.width || "";
          img.style.height = updatedNode.attrs.height || "";
          const newAlign = updatedNode.attrs.align;
          applyContainerAlign(newAlign);
          img.style.display = (newAlign === "center" || newAlign === "right") ? "inline-block" : "block";
          return true;
        },
      };
    };
  },
});

const FONT_SIZES = [
  { label: "Small", value: "12px" },
  { label: "Normal", value: "14px" },
  { label: "Medium", value: "16px" },
  { label: "Large", value: "20px" },
  { label: "X-Large", value: "24px" },
  { label: "Huge", value: "32px" },
];

const TEXT_COLORS = [
  { label: "Default", value: "" },
  { label: "White", value: "#ffffff" },
  { label: "Light Gray", value: "#d1d5db" },
  { label: "Gray", value: "#9ca3af" },
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Yellow", value: "#eab308" },
  { label: "Lime", value: "#84cc16" },
  { label: "Green", value: "#22c55e" },
  { label: "Emerald", value: "#10b981" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Sky", value: "#0ea5e9" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Purple", value: "#a855f7" },
  { label: "Fuchsia", value: "#d946ef" },
  { label: "Pink", value: "#ec4899" },
  { label: "Rose", value: "#f43f5e" },
];

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  "data-testid"?: string;
}

function ToolbarButton({
  onClick,
  isActive,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant={isActive ? "secondary" : "ghost"}
      className="toggle-elevate"
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );
}

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch("/api/upload-image", {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) {
    throw new Error("Failed to upload image");
  }
  const data = await res.json();
  return data.url;
}

function ColorPicker({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const currentColor = editor.getAttributes("textStyle").color || "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="toggle-elevate relative"
          title="Text Color"
          data-testid="button-text-color"
        >
          <Palette className="w-4 h-4" />
          <div
            className="absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full"
            style={{ backgroundColor: currentColor || "hsl(var(--foreground))" }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start" side="bottom">
        <div className="grid grid-cols-7 gap-1">
          {TEXT_COLORS.map((color) => (
            <button
              key={color.label}
              type="button"
              title={color.label}
              className="w-6 h-6 rounded-md border border-white/10 flex items-center justify-center transition-transform hover:scale-110"
              style={{ backgroundColor: color.value || "transparent" }}
              onClick={() => {
                if (!color.value) {
                  editor.chain().focus().unsetColor().run();
                } else {
                  editor.chain().focus().setColor(color.value).run();
                }
                setOpen(false);
              }}
              data-testid={`button-color-${color.label.toLowerCase().replace(/\s/g, "-")}`}
            >
              {!color.value && (
                <span className="text-xs text-foreground/70">A</span>
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Enter content here...",
  "data-testid": testId,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TextStyle,
      Color,
      FontSize,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[200px] w-full px-3 py-2 text-base text-foreground focus:outline-none md:text-sm prose prose-invert prose-sm max-w-none prose-headings:font-display prose-headings:text-primary prose-p:my-1 prose-li:my-0",
        "data-testid": testId || "richtext-editor",
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/") && item.kind === "file") {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              uploadImage(file).then((url) => {
                editorRef.current?.chain().focus().setImage({ src: url }).run();
              }).catch(console.error);
            }
            return true;
          }
        }

        const html = event.clipboardData?.getData("text/html");
        if (html) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const images = doc.querySelectorAll("img");
          const base64Images = Array.from(images).filter((img) => {
            const src = img.getAttribute("src");
            return src && src.startsWith("data:image/");
          });

          if (base64Images.length > 0) {
            event.preventDefault();
            const uploadPromises = base64Images.map(async (img) => {
              const src = img.getAttribute("src")!;
              try {
                const byteString = atob(src.split(",")[1]);
                const mimeString = src.split(",")[0].split(":")[1].split(";")[0];
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                  ia[i] = byteString.charCodeAt(i);
                }
                const blob = new Blob([ab], { type: mimeString });
                const file = new File([blob], "pasted-image.png", { type: mimeString });
                const url = await uploadImage(file);
                img.setAttribute("src", url);
              } catch (err) {
                console.error("Failed to upload pasted image:", err);
              }
            });

            Promise.all(uploadPromises).then(() => {
              const updatedHtml = doc.body.innerHTML;
              editorRef.current?.commands.insertContent(updatedHtml);
            });
            return true;
          }
        }

        return false;
      },
      handleDrop: (_view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;

        const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
        if (imageFiles.length === 0) return false;

        event.preventDefault();

        imageFiles.forEach((file) => {
          uploadImage(file).then((url) => {
            editorRef.current?.chain().focus().setImage({ src: url }).run();
          }).catch(console.error);
        });

        return true;
      },
    },
  });

  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
    }
  }, [editor]);

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;
      try {
        const url = await uploadImage(file);
        editor.chain().focus().setImage({ src: url }).run();
      } catch (err) {
        console.error("Image upload failed:", err);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [editor]
  );

  if (!editor) return null;

  return (
    <div className="rounded-md border border-white/10 bg-background/50 overflow-visible">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={onFileSelected}
        data-testid="input-image-upload"
      />
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-white/10">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          title="Underline"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>

        <ColorPicker editor={editor} />

        <Separator orientation="vertical" className="h-5 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <Select
          value={editor.getAttributes("textStyle").fontSize || ""}
          onValueChange={(value) => {
            if (value === "default") {
              editor.chain().focus().unsetFontSize().run();
            } else {
              editor.chain().focus().setFontSize(value).run();
            }
          }}
        >
          <SelectTrigger className="h-9 w-[90px] bg-transparent border-white/10 text-xs" data-testid="select-font-size">
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size.value} value={size.value}>
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <Minus className="w-4 h-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          isActive={editor.isActive({ textAlign: "left" })}
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          isActive={editor.isActive({ textAlign: "center" })}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          isActive={editor.isActive({ textAlign: "right" })}
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <ToolbarButton onClick={setLink} isActive={editor.isActive("link")} title="Link">
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={handleImageUpload} title="Upload Image">
          <ImagePlus className="w-4 h-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
