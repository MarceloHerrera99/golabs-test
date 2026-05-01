"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  BotIcon,
  DatabaseIcon,
  FileTextIcon,
  MessageCircleIcon,
  MoonIcon,
  PlusIcon,
  SendIcon,
  SparklesIcon,
  SunIcon,
  UploadCloudIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/ui/dropzone";
import {
  AIConversation,
  AIConversationContent,
  AIConversationScrollButton,
} from "@/components/ui/ai/conversation";
import {
  AIInput,
  AIInputSubmit,
  AIInputTextarea,
  AIInputToolbar,
  AIInputTools,
} from "@/components/ui/ai/input";
import { AIMessage, AIMessageContent } from "@/components/ui/ai/message";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Mode = "chat" | "rag";
type UploadState = {
  files: File[];
  busy: boolean;
  message: string | null;
  tone: "neutral" | "error" | "success";
};

const maxFileSize = 20 * 1024 * 1024;

export function RagDashboard() {
  const { isLoaded: isClerkLoaded, isSignedIn, user } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { theme, setTheme } = useTheme();
  const [mode, setMode] = useState<Mode>("chat");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [activeByMode, setActiveByMode] = useState<
    Partial<Record<Mode, Id<"conversations"> | null>>
  >({});
  const [upload, setUpload] = useState<UploadState>({
    files: [],
    busy: false,
    message: null,
    tone: "neutral",
  });

  const queryArgs = isAuthenticated ? {} : "skip";
  const queriedDocuments = useQuery(api.documents.list, queryArgs);
  const queriedConversations = useQuery(
    api.chat.listConversations,
    isAuthenticated ? { mode } : "skip"
  );
  const documents = useMemo(() => queriedDocuments ?? [], [queriedDocuments]);
  const conversations = useMemo(
    () => queriedConversations ?? [],
    [queriedConversations]
  );
  const selectedConversation = activeByMode[mode];
  const activeConversationId =
    selectedConversation === undefined
      ? conversations[0]?._id
      : selectedConversation ?? undefined;
  const messages = useQuery(
    api.chat.listMessages,
    isAuthenticated && activeConversationId
      ? { conversationId: activeConversationId }
      : "skip"
  );
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const processDocument = useAction(api.documentActions.processDocument);
  const sendMessage = useAction(api.chatActions.sendMessage);

  useEffect(() => {
    const firstConversation = conversations[0];
    if (activeByMode[mode] === undefined && firstConversation) {
      setActiveByMode((current) => ({
        ...current,
        [mode]: firstConversation._id,
      }));
    }
  }, [activeByMode, conversations, mode]);

  const readyDocuments = useMemo(
    () => documents.filter((document) => document.status === "ready"),
    [documents]
  );
  const isAuthReady = isClerkLoaded && isSignedIn && isAuthenticated;
  const authIssueMessage =
    isClerkLoaded && isSignedIn && !isLoading && !isAuthenticated
      ? "Clerk inicio sesion, pero Convex no recibio el JWT. Revisa el template JWT llamado convex en Clerk."
      : "La sesion todavia se esta preparando.";

  async function handleUpload(files: File[]) {
    if (!isAuthReady) {
      setUpload({
        files,
        busy: false,
        message: authIssueMessage,
        tone: "error",
      });
      return;
    }

    setUpload({ files, busy: true, message: null, tone: "neutral" });

    try {
      for (const file of files) {
        validateFile(file);
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || fallbackMimeType(file) },
          body: file,
        });

        if (!response.ok) {
          throw new Error("No se pudo subir el archivo a Convex Storage.");
        }

        const { storageId } = (await response.json()) as {
          storageId: Id<"_storage">;
        };

        await processDocument({
          storageId,
          name: file.name,
          mimeType: file.type || fallbackMimeType(file),
          size: file.size,
        });
      }

      setUpload({
        files: [],
        busy: false,
        message: "Archivo procesado.",
        tone: "success",
      });
    } catch (error) {
      setUpload({
        files,
        busy: false,
        message: error instanceof Error ? error.message : "Error al cargar.",
        tone: "error",
      });
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = message.trim();

    if (!content || sending || !isAuthReady) {
      return;
    }

    setMessage("");
    setSending(true);

    try {
      const result = await sendMessage({
        conversationId: activeConversationId,
        mode,
        content,
      });

      setActiveByMode((current) => ({
        ...current,
        [mode]: result.conversationId,
      }));
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card/85 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <SparklesIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold">
                Centro de respuestas
              </h1>
              <p className="truncate text-sm text-muted-foreground">
                {user?.primaryEmailAddress?.emailAddress ?? "Sesion activa"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
              <TabsList className="h-10 rounded-md">
                <TabsTrigger value="chat">
                  <MessageCircleIcon />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="rag">
                  <DatabaseIcon />
                  RAG
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label="Cambiar tema"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <SunIcon className="size-4 dark:hidden" />
                  <MoonIcon className="hidden size-4 dark:block" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Cambiar tema</TooltipContent>
            </Tooltip>
            <UserButton />
          </div>
        </header>

        {isLoading && (
          <div className="flex flex-1 items-center justify-center">
            <div className="rounded-lg border bg-card/85 px-5 py-4 text-sm text-muted-foreground shadow-sm">
              Preparando tu sesion...
            </div>
          </div>
        )}

        {!isLoading && (
        <section className="grid flex-1 gap-4 py-4 lg:grid-cols-[340px_1fr]">
          <aside className="grid min-h-0 gap-4 lg:grid-rows-[auto_1fr]">
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">Archivos</CardTitle>
                  <Badge variant="secondary">{readyDocuments.length} listos</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Dropzone
                  accept={{
                    "application/pdf": [".pdf"],
                    "text/csv": [".csv"],
                  }}
                  disabled={upload.busy || !isAuthReady}
                  maxFiles={0}
                  maxSize={maxFileSize}
                  onDrop={handleUpload}
                  onError={(error) =>
                    setUpload({
                      files: [],
                      busy: false,
                      message: error.message,
                      tone: "error",
                    })
                  }
                  src={upload.files.length > 0 ? upload.files : undefined}
                  className="min-h-32 rounded-lg border-dashed bg-accent/45"
                >
                  <DropzoneEmptyState>
                    <div className="flex flex-col items-center gap-2 text-center">
                      <UploadCloudIcon className="size-6 text-primary" />
                      <div className="text-sm font-medium">CSV o PDF</div>
                      <div className="text-xs text-muted-foreground">
                        {isAuthReady
                          ? "Max. 20 MB por archivo"
                          : "Esperando autenticacion de Convex"}
                      </div>
                    </div>
                  </DropzoneEmptyState>
                  <DropzoneContent />
                </Dropzone>
                {upload.message && (
                  <p
                    className={cn(
                      "text-sm",
                      upload.tone === "error" && "text-destructive",
                      upload.tone === "success" && "text-emerald-600"
                    )}
                  >
                    {upload.message}
                  </p>
                )}
                {!isAuthReady && !upload.message && (
                  <p className="text-sm text-muted-foreground">
                    {authIssueMessage}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="min-h-0 overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Biblioteca</CardTitle>
                  <FileTextIcon className="size-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="min-h-0 p-0">
                <ScrollArea className="h-[320px] px-4 pb-4 lg:h-[calc(100svh-29rem)]">
                  <div className="space-y-2">
                    {documents.length === 0 && (
                      <EmptyLine text="Sin archivos cargados" />
                    )}
                    {documents.map((document) => (
                      <div
                        className="rounded-lg border bg-background/70 p-3"
                        key={document._id}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {document.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {document.type.toUpperCase()} -{" "}
                              {formatBytes(document.size)}
                            </p>
                          </div>
                          <StatusBadge status={document.status} />
                        </div>
                        {document.status === "ready" && (
                          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                            {document.rowCount
                              ? `${document.rowCount} filas - ${
                                  document.columnNames?.length ?? 0
                                } columnas`
                              : `${document.chunkCount ?? 0} fragmentos`}
                          </p>
                        )}
                        {document.error && (
                          <p className="mt-2 line-clamp-2 text-xs text-destructive">
                            {document.error}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </aside>

          <Card className="flex min-h-[680px] overflow-hidden">
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    {mode === "chat" ? (
                      <MessageCircleIcon className="size-4 text-primary" />
                    ) : (
                      <BotIcon className="size-4 text-primary" />
                    )}
                    <h2 className="text-base font-semibold">
                      {mode === "chat" ? "Chat" : "RAG"}
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {mode === "chat"
                      ? "Contexto privado de conversacion"
                      : `${readyDocuments.length} fuentes disponibles`}
                  </p>
                </div>
                <Button
                  onClick={() =>
                    setActiveByMode((current) => ({
                      ...current,
                      [mode]: null,
                    }))
                  }
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <PlusIcon />
                  Nuevo
                </Button>
              </div>

              <AIConversation className="min-h-0">
                <AIConversationContent className="space-y-4">
                  {!messages?.length && (
                    <div className="flex h-[420px] items-center justify-center">
                      <div className="max-w-sm rounded-lg border bg-accent/35 p-5 text-center">
                        <SparklesIcon className="mx-auto mb-3 size-6 text-primary" />
                        <p className="text-sm text-muted-foreground">
                          {mode === "rag"
                            ? "Las respuestas citaran tus documentos procesados."
                            : "El historial se mantiene aislado en tu cuenta."}
                        </p>
                      </div>
                    </div>
                  )}

                  {messages?.map((item) => (
                    <AIMessage from={item.role} key={item._id}>
                      <AIMessageContent
                        className={cn(
                          item.role === "assistant" &&
                            "bg-card/90 text-card-foreground"
                        )}
                      >
                        <ReactMarkdown>{item.content}</ReactMarkdown>
                        {item.sources && item.sources.length > 0 && (
                          <>
                            <Separator />
                            <div className="flex flex-wrap gap-2">
                              {item.sources.map((source, index) => (
                                source.url ? (
                                  <Badge
                                    asChild
                                    key={`${source.documentName}-${index}`}
                                    variant="outline"
                                  >
                                    <a
                                      href={source.url}
                                      rel="noreferrer"
                                      target="_blank"
                                    >
                                      {source.documentName}
                                    </a>
                                  </Badge>
                                ) : (
                                  <Badge
                                    key={`${source.documentName}-${index}`}
                                    variant="outline"
                                  >
                                    {source.documentName}
                                  </Badge>
                                )
                              ))}
                            </div>
                          </>
                        )}
                      </AIMessageContent>
                    </AIMessage>
                  ))}
                </AIConversationContent>
                <AIConversationScrollButton />
              </AIConversation>

              <div className="border-t bg-card/70 p-3">
                <AIInput onSubmit={handleSubmit}>
                  <AIInputTextarea
                    disabled={sending || !isAuthReady}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={
                      mode === "rag"
                        ? "Pregunta sobre tus CSV o PDF..."
                        : "Escribe un mensaje..."
                    }
                    value={message}
                  />
                  <AIInputToolbar>
                    <AIInputTools>
                      <Badge variant="secondary">
                        {mode === "rag" ? "RAG privado" : "Chat privado"}
                      </Badge>
                    </AIInputTools>
                    <AIInputSubmit
                      disabled={!message.trim() || sending || !isAuthReady}
                      status={sending ? "submitted" : "ready"}
                    >
                      {!sending && <SendIcon />}
                    </AIInputSubmit>
                  </AIInputToolbar>
                </AIInput>
              </div>
            </div>
          </Card>
        </section>
        )}
      </div>
    </main>
  );
}

function validateFile(file: File) {
  const name = file.name.toLowerCase();
  const isAllowed = name.endsWith(".csv") || name.endsWith(".pdf");

  if (!isAllowed) {
    throw new Error("Solo se aceptan CSV y PDF.");
  }

  if (file.size > maxFileSize) {
    throw new Error("El archivo supera el limite de 20 MB.");
  }
}

function fallbackMimeType(file: File) {
  return file.name.toLowerCase().endsWith(".pdf")
    ? "application/pdf"
    : "text/csv";
}

function StatusBadge({
  status,
}: {
  status: "processing" | "ready" | "failed";
}) {
  if (status === "ready") {
    return <Badge className="bg-emerald-500 text-white">Listo</Badge>;
  }

  if (status === "failed") {
    return <Badge variant="destructive">Error</Badge>;
  }

  return <Badge variant="secondary">Procesando</Badge>;
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** index;

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}
