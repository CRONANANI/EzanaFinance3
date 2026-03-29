'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef(
  ({ className, sideOffset = 4, showArrow = false, ...props }, ref) => (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'relative z-50 max-w-[280px] rounded-md bg-zinc-900 text-zinc-100 px-2 py-1 text-xs shadow-md',
          className,
        )}
        {...props}
      >
        {props.children}
        {showArrow && <TooltipPrimitive.Arrow className="fill-zinc-900" />}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  ),
);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverContent = React.forwardRef(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-72 rounded-xl bg-zinc-900 border border-zinc-700 p-2 text-zinc-100 shadow-lg outline-none',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;
const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/70 backdrop-blur-sm', className)}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 w-full max-w-[min(90vw,800px)] -translate-x-1/2 -translate-y-1/2 p-4',
        className,
      )}
      {...props}
    >
      <div className="relative rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-700 shadow-2xl p-1">
        {children}
        <DialogPrimitive.Close className="absolute right-3 top-3 z-10 rounded-full bg-zinc-800 p-1.5 hover:bg-zinc-700 transition-colors">
          <XIcon className="h-5 w-5 text-zinc-300" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </div>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const PlusIcon = (props) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M12 5V19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 12H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Settings2Icon = (props) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path d="M20 7h-9" />
    <path d="M14 17H5" />
    <circle cx="17" cy="17" r="3" />
    <circle cx="7" cy="7" r="3" />
  </svg>
);
const SendIcon = (props) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M12 5.25L12 18.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18.75 12L12 5.25L5.25 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const XIcon = (props) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const MicIcon = (props) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
  </svg>
);

/** Stock research tools (Company Research page) */
export const EZANA_RESEARCH_TOOLS = [
  { id: 'grpv', name: 'GRPV analysis', shortName: 'GRPV', href: '/company-research#modelDetailSection' },
  { id: 'dcf', name: 'DCF valuation', shortName: 'DCF', href: '/company-research#modelDetailSection' },
  { id: 'risk', name: 'Risk analysis', shortName: 'Risk', href: '/company-research#modelDetailSection' },
  { id: 'earnings', name: 'Earnings analysis', shortName: 'Earnings', href: '/company-research#earnings-card' },
  { id: 'technical', name: 'Technical analysis', shortName: 'Technical', href: '/company-research#marketChartSection' },
  { id: 'dividend', name: 'Dividend strategy', shortName: 'Dividend', href: '/company-research#stat-divyield' },
];

export function CentaurPromptBox({
  onSend,
  disabled = false,
  placeholder = 'Message Yohannes…',
  className,
}) {
  const internalTextareaRef = React.useRef(null);
  const fileInputRef = React.useRef(null);
  const [value, setValue] = React.useState('');
  const [imagePreview, setImagePreview] = React.useState(null);
  const [fileNames, setFileNames] = React.useState([]);
  const [selectedTool, setSelectedTool] = React.useState(null);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = React.useState(false);
  const [listening, setListening] = React.useState(false);

  React.useLayoutEffect(() => {
    const textarea = internalTextareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handlePlusClick = () => fileInputRef.current?.click();

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length) {
      setFileNames((prev) => [...prev, ...files.map((f) => f.name)]);
      const img = files.find((f) => f.type.startsWith('image/'));
      if (img) {
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(img);
      }
    }
    event.target.value = '';
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleMic = () => {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      setValue((v) => (v ? `${v} ` : '') + '[Voice input is not supported in this browser.]');
      return;
    }
    if (listening) {
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      const text = ev.results[0]?.[0]?.transcript?.trim();
      if (text) setValue((prev) => (prev ? `${prev} ${text}` : text));
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  const submit = (e) => {
    e?.preventDefault();
    const tool = EZANA_RESEARCH_TOOLS.find((t) => t.id === selectedTool);
    const toolNote = tool ? `\n\n[Research context: ${tool.name} — see ${tool.href}]` : '';
    const fileNote = fileNames.length ? `\n\n[Attached files: ${fileNames.join(', ')}]` : '';
    const msg = `${value.trim()}${toolNote}${fileNote}`.trim();
    if (!msg && !imagePreview) return;
    onSend?.({
      text: msg || '(attachment)',
      rawText: value.trim(),
      imageDataUrl: imagePreview,
      fileNames: [...fileNames],
      toolId: selectedTool,
    });
    setValue('');
    setImagePreview(null);
    setFileNames([]);
    setSelectedTool(null);
  };

  const hasValue = value.trim().length > 0 || imagePreview || fileNames.length > 0;
  const activeTool = selectedTool ? EZANA_RESEARCH_TOOLS.find((t) => t.id === selectedTool) : null;

  return (
    <form onSubmit={submit} className={cn('flex flex-col', className)}>
      <div
        className={cn(
          'flex flex-col rounded-[28px] p-2 shadow-lg transition-colors bg-zinc-900/90 border border-zinc-700/80 cursor-text',
        )}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept="image/*,application/pdf,.csv,.txt"
        />

        {imagePreview && (
          <>
            <div className="relative mb-1 w-fit rounded-2xl px-1 pt-1">
              <button type="button" className="transition-transform" onClick={() => setIsImageDialogOpen(true)}>
                <img src={imagePreview} alt="" className="h-16 w-16 rounded-2xl object-cover" />
              </button>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-white hover:bg-zinc-600"
                aria-label="Remove image"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </div>
            <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
              <DialogContent>
                <img src={imagePreview} alt="Preview" className="w-full max-h-[85vh] object-contain rounded-2xl" />
              </DialogContent>
            </Dialog>
          </>
        )}

        {fileNames.length > 0 && !imagePreview && (
          <div className="px-3 py-1 text-xs text-zinc-400">
            Files: {fileNames.join(', ')}
          </div>
        )}

        <textarea
          ref={internalTextareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="custom-scrollbar w-full resize-none border-0 bg-transparent p-3 text-zinc-100 placeholder:text-zinc-500 focus:ring-0 focus-visible:outline-none min-h-12"
        />

        <div className="mt-0.5 p-1 pt-0">
          <TooltipProvider delayDuration={100}>
            <div className="flex items-center gap-2 flex-wrap">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handlePlusClick}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-200 hover:bg-zinc-800"
                  >
                    <PlusIcon className="h-6 w-6" />
                    <span className="sr-only">Attach files</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" showArrow>
                  <p>Add files from your device</p>
                </TooltipContent>
              </Tooltip>

              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex h-9 items-center gap-2 rounded-full px-2 text-sm text-zinc-200 hover:bg-zinc-800"
                      >
                        <Settings2Icon className="h-4 w-4" />
                        {!selectedTool && 'Tools'}
                      </button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top" showArrow>
                    <p>Company research evaluators</p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent side="top" align="start">
                  <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 px-2 py-1">From Company Research</p>
                    {EZANA_RESEARCH_TOOLS.map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => {
                          setSelectedTool(tool.id);
                          setIsPopoverOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-zinc-800 text-zinc-200"
                      >
                        <span>{tool.name}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {activeTool && (
                <>
                  <div className="h-4 w-px bg-zinc-600" />
                  <button
                    type="button"
                    onClick={() => setSelectedTool(null)}
                    className="flex h-9 items-center gap-1 rounded-full px-2 text-sm text-amber-300/90 hover:bg-zinc-800"
                  >
                    {activeTool.shortName}
                    <XIcon className="h-3 w-3" />
                  </button>
                </>
              )}

              <div className="ml-auto flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={toggleMic}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full text-zinc-200 hover:bg-zinc-800',
                        listening && 'text-amber-400 ring-1 ring-amber-500/50',
                      )}
                    >
                      <MicIcon className="h-5 w-5" />
                      <span className="sr-only">Voice input</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" showArrow>
                    <p>{listening ? 'Listening…' : 'Speak to add to your prompt'}</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="submit"
                      disabled={disabled || !hasValue}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <SendIcon className="h-5 w-5" />
                      <span className="sr-only">Send</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" showArrow>
                    <p>Send</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </TooltipProvider>
        </div>
      </div>
    </form>
  );
}
