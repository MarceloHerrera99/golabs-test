"use client";

import { UserButton, useAuth, useUser } from "@clerk/nextjs";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  ArchiveIcon,
  BotIcon,
  FileTextIcon,
  FolderUpIcon,
  LibraryIcon,
  MessageCircleIcon,
  PlusIcon,
  RefreshCwIcon,
  ShieldIcon,
  SparklesIcon,
  UploadIcon,
  UsersIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import {
  convexApi,
  type DocumentStatus,
  type Message,
  type RagDocument,
  type Role,
  type TeamUser,
} from "@/lib/convex-api";
import {
  AIInput,
  AIInputSubmit,
  AIInputTextarea,
  AIInputToolbar,
} from "@/components/ui/ai/input";
import {
  AIMessage,
  AIMessageAvatar,
  AIMessageContent,
} from "@/components/ui/ai/message";
import {
  AISource,
  AISources,
  AISourcesContent,
  AISourcesTrigger,
} from "@/components/ui/ai/source";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/ui/dropzone";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

const acceptedFiles = {
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
    ".pptx",
  ],
};

function formatDate(value: number) {
  return new Intl.DateTimeFormat("es-NI", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function renderBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function initials(name?: string | null, email?: string | null) {
  const source = name || email || "Usuario";
  return source
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function roleLabel(role: Role) {
  const labels: Record<Role, string> = {
    admin: "Admin",
    editor: "Editor",
    user: "Usuario",
  };

  return labels[role];
}

function statusLabel(status: DocumentStatus) {
  const labels: Record<DocumentStatus, string> = {
    uploaded: "Subido",
    indexing: "Indexando",
    indexed: "Indexado",
    failed: "Error",
    archived: "Archivado",
  };

  return labels[status];
}

function statusVariant(status: DocumentStatus) {
  if (status === "failed") {
    return "destructive" as const;
  }

  if (status === "indexed") {
    return "default" as const;
  }

  return "secondary" as const;
}

export function RagDashboard() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { isLoaded: isClerkLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const syncViewer = useMutation(convexApi.users.syncViewer);
  const viewer = useQuery(
    convexApi.users.viewer,
    isAuthenticated ? {} : "skip",
  );
  const hasProfile = Boolean(viewer?.id);
  const conversations = useQuery(
    convexApi.conversations.list,
    hasProfile ? {} : "skip",
  );
  const documents = useQuery(
    convexApi.documents.list,
    hasProfile ? {} : "skip",
  );
  const stats = useQuery(
    convexApi.documents.documentStats,
    hasProfile ? {} : "skip",
  );
  const teamUsers = useQuery(
    convexApi.users.list,
    viewer?.role === "admin" ? {} : "skip",
  );
  const createConversation = useMutation(convexApi.conversations.create);
  const sendMessage = useAction(convexApi.agent.sendMessage);
  const generateUploadUrl = useMutation(convexApi.documents.generateUploadUrl);
  const createDocument = useMutation(convexApi.documents.create);
  const retryIndex = useMutation(convexApi.documents.retryIndex);
  const archiveDocument = useMutation(convexApi.documents.archive);
  const setRole = useMutation(convexApi.users.setRole);
  const [selectedConversationId, setSelectedConversationId] =
    useState<Id<"conversations"> | null>(null);
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [hasAuthTimedOut, setHasAuthTimedOut] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messages = useQuery(
    convexApi.conversations.listMessages,
    selectedConversationId
      ? { conversationId: selectedConversationId }
      : "skip",
  );
  const canManageDocuments =
    viewer?.role === "admin" || viewer?.role === "editor";
  const isDocumentStateLoading = stats === undefined;
  const hasIndexedDocuments = Boolean(stats?.indexed);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void syncViewer({}).catch(() => {
      toast.error("No pude sincronizar tu perfil.");
    });
  }, [isAuthenticated, syncViewer]);

  useEffect(() => {
    if (selectedConversationId || !conversations?.length) {
      return;
    }

    const firstConversation = conversations[0];
    if (firstConversation) {
      setSelectedConversationId(firstConversation._id);
    }
  }, [conversations, selectedConversationId]);

  useEffect(() => {
    if (!isClerkLoaded || !isSignedIn || !isLoading) {
      setHasAuthTimedOut(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setHasAuthTimedOut(true);
    }, 8000);

    return () => window.clearTimeout(timeout);
  }, [isClerkLoaded, isLoading, isSignedIn]);

  if (!isClerkLoaded) {
    return <DashboardSkeleton />;
  }

  if (!isSignedIn) {
    return (
      <AuthStatusCard
        action={
          <Button asChild>
            <Link href="/sign-in">Iniciar sesión</Link>
          </Button>
        }
        description="Necesitas iniciar sesión antes de abrir el dashboard."
        title="Sesión requerida"
      />
    );
  }

  if (hasAuthTimedOut || (!isLoading && !isAuthenticated)) {
    return (
      <AuthStatusCard
        action={
          <Button onClick={() => window.location.reload()} variant="outline">
            <RefreshCwIcon data-icon="inline-start" />
            Reintentar
          </Button>
        }
        description="Clerk ya cargó tu sesión, pero Convex no pudo validarla. Verifica que CLERK_JWT_ISSUER_DOMAIN use el issuer base de Clerk, no la URL de JWKS."
        title="No pude validar la sesión con Convex"
      />
    );
  }

  if (isLoading || !isAuthenticated) {
    return <DashboardSkeleton />;
  }

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanPrompt = prompt.trim();

    if (!cleanPrompt || isSending) {
      return;
    }

    setIsSending(true);
    setPrompt("");

    try {
      let conversationId = selectedConversationId;
      if (!conversationId) {
        conversationId = await createConversation({
          title: cleanPrompt.slice(0, 64),
        });
        setSelectedConversationId(conversationId);
      }

      const result = await sendMessage({
        conversationId,
        prompt: cleanPrompt,
      });

      setSelectedConversationId(result.conversationId);

      if (result.status === "error") {
        toast.warning("El agente respondió con una advertencia.");
      }
    } catch (error) {
      setPrompt(cleanPrompt);
      toast.error(
        error instanceof Error ? error.message : "No pude enviar el mensaje.",
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleUpload() {
    const file = files[0];
    if (!file || isUploading) {
      return;
    }

    setIsUploading(true);

    try {
      const uploadUrl = await generateUploadUrl({});
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("No se pudo subir el archivo a Convex Storage.");
      }

      const { storageId } = (await uploadResponse.json()) as {
        storageId: Id<"_storage">;
      };

      await createDocument({
        storageId,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
      });

      setFiles([]);
      toast.success("Archivo subido. La indexación iniciará automáticamente.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No pude subir el archivo.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent px-3 py-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <SparklesIcon />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold">Pellas RAG</span>
              <span className="truncate text-xs text-muted-foreground">
                Agente documental
              </span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Conversaciones</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setSelectedConversationId(null)}
                    tooltip="Nueva conversación"
                  >
                    <PlusIcon />
                    <span>Nueva conversación</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {conversations?.map((conversation) => (
                  <SidebarMenuItem key={conversation._id}>
                    <SidebarMenuButton
                      isActive={conversation._id === selectedConversationId}
                      onClick={() =>
                        setSelectedConversationId(conversation._id)
                      }
                      tooltip={conversation.title}
                    >
                      <MessageCircleIcon />
                      <span>{conversation.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-3 rounded-lg border bg-background/70 p-2">
            <UserButton />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">
                {user?.fullName || viewer?.email || "Usuario"}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {viewer ? roleLabel(viewer.role) : "Sincronizando"}
              </span>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <main className="flex min-h-svh flex-col">
          <header className="sticky top-0 z-10 border-b bg-background/82 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-6">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <Separator orientation="vertical" className="h-6" />
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">
                    Dashboard autenticado
                  </span>
                  <h1 className="text-xl font-semibold tracking-tight">
                    {hasIndexedDocuments
                      ? "Chat RAG con archivos indexados"
                      : "Chat documental"}
                  </h1>
                </div>
              </div>
              <div className="hidden items-center gap-2 md:flex">
                <Badge variant="secondary">
                  <LibraryIcon />
                  {stats?.indexed ?? 0} indexados
                </Badge>
                <Badge variant="outline">
                  <ShieldIcon />
                  {viewer ? roleLabel(viewer.role) : "Rol"}
                </Badge>
              </div>
            </div>
          </header>

          <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:p-6">
            <ChatPanel
              hasIndexedDocuments={hasIndexedDocuments}
              isDocumentStateLoading={isDocumentStateLoading}
              isSending={isSending}
              messages={selectedConversationId ? messages : []}
              onSubmit={handleSend}
              prompt={prompt}
              setPrompt={setPrompt}
              userImage={user?.imageUrl}
              userName={user?.fullName || viewer?.email}
            />

            <aside className="flex flex-col gap-4">
              <KnowledgePanel
                canManage={canManageDocuments}
                documents={documents}
                files={files}
                isUploading={isUploading}
                onArchive={async (documentId) => {
                  await archiveDocument({ documentId });
                  toast.success("Documento archivado.");
                }}
                onRetry={async (documentId) => {
                  await retryIndex({ documentId });
                  toast.success("Reintentando indexación.");
                }}
                onUpload={handleUpload}
                setFiles={setFiles}
                stats={stats}
              />

              {viewer?.role === "admin" ? (
                <TeamPanel
                  onRoleChange={async (userId, role) => {
                    await setRole({ userId, role });
                    toast.success("Rol actualizado.");
                  }}
                  users={teamUsers}
                />
              ) : null}
            </aside>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function ChatPanel({
  hasIndexedDocuments,
  isDocumentStateLoading,
  isSending,
  messages,
  onSubmit,
  prompt,
  setPrompt,
  userImage,
  userName,
}: {
  hasIndexedDocuments: boolean;
  isDocumentStateLoading: boolean;
  isSending: boolean;
  messages: Message[] | undefined;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  prompt: string;
  setPrompt: (value: string) => void;
  userImage?: string;
  userName?: string | null;
}) {
  const canSendMessage = !isSending;

  return (
    <Card className="flex min-h-[calc(100svh-8rem)] flex-col overflow-hidden border bg-card/82 shadow-lg">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              <BotIcon />
              {hasIndexedDocuments ? "Agente RAG" : "Agente documental"}
            </CardTitle>
            <CardDescription>
              {isDocumentStateLoading
                ? "Preparando el estado de documentos del workspace."
                : hasIndexedDocuments
                  ? "Haz preguntas en lenguaje natural. El agente buscará en los documentos indexados y responderá con fuentes."
                    : "Puedes iniciar una conversacion ahora. Cuando existan documentos indexados, el agente respondera con fuentes."}
            </CardDescription>
          </div>
          <Badge variant={hasIndexedDocuments ? "secondary" : "outline"}>
            {isDocumentStateLoading
              ? "Cargando"
              : hasIndexedDocuments
                ? "OpenAI GPT-5.5"
                : "Sin documentos"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <ScrollArea className="min-h-0 flex-1 pr-2">
          <div className="flex min-h-[36rem] flex-col gap-3">
            {isDocumentStateLoading ? (
              <MessageSkeleton />
            ) : !messages ? (
              <MessageSkeleton />
            ) : messages.length === 0 ? (
              <Empty className="min-h-[30rem] border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <SparklesIcon />
                  </EmptyMedia>
                  <EmptyTitle>Empecemos con una pregunta</EmptyTitle>
                  <EmptyDescription>
                    Prueba: “Resume las políticas principales del último
                    documento subido y dime de qué archivo salen.”
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Badge variant="secondary">Las citas son obligatorias</Badge>
                </EmptyContent>
              </Empty>
            ) : (
              messages.map((message) => (
                <ChatMessage
                  key={message._id}
                  message={message}
                  userImage={userImage}
                  userName={userName}
                />
              ))
            )}

            {isSending ? (
              <AIMessage from="assistant">
                <AIMessageContent>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Spinner />
                    Consultando documentos y preparando respuesta...
                  </div>
                </AIMessageContent>
                <AIMessageAvatar name="AI" src="" />
              </AIMessage>
            ) : null}
          </div>
        </ScrollArea>

        <AIInput onSubmit={onSubmit}>
          <AIInputTextarea
            disabled={!canSendMessage}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={
              hasIndexedDocuments
                ? "Pregunta algo sobre los documentos subidos..."
                : isDocumentStateLoading
                  ? "Cargando documentos..."
                    : "Escribe tu mensaje..."
            }
            value={prompt}
          />
          <AIInputToolbar>
            <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
              <FileTextIcon />
              {isDocumentStateLoading
                ? "Validando documentos del workspace"
                : hasIndexedDocuments
                  ? "Responde con RAG y fuentes"
                  : "Chat activo sin fuentes RAG"}
            </div>
            <AIInputSubmit
              disabled={!prompt.trim() || !canSendMessage}
              status={isSending ? "submitted" : "ready"}
            />
          </AIInputToolbar>
        </AIInput>
      </CardContent>
    </Card>
  );
}

function ChatMessage({
  message,
  userImage,
  userName,
}: {
  message: Message;
  userImage?: string;
  userName?: string | null;
}) {
  const from = message.role === "assistant" ? "assistant" : "user";

  return (
    <AIMessage from={from}>
      <AIMessageContent
        className={message.status === "error" ? "border-destructive/40" : ""}
      >
        {message.status === "error" ? (
          <Alert variant="destructive">
            <AlertTitle>Respuesta incompleta</AlertTitle>
            <AlertDescription>{message.content}</AlertDescription>
          </Alert>
        ) : (
          <div className="flex flex-col gap-3">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
            {message.citations.length > 0 ? (
              <AISources>
                <AISourcesTrigger count={message.citations.length} />
                <AISourcesContent>
                  {message.citations.map((citation, index) => (
                    <AISource
                      href={`#source-${citation.fileId ?? index}`}
                      key={`${citation.fileId ?? citation.fileName}-${index}`}
                      title={citation.fileName}
                    >
                      <FileTextIcon />
                      <span className="font-medium">{citation.fileName}</span>
                    </AISource>
                  ))}
                </AISourcesContent>
              </AISources>
            ) : null}
          </div>
        )}
      </AIMessageContent>
      <AIMessageAvatar
        name={from === "assistant" ? "AI" : userName || "ME"}
        src={from === "assistant" ? "" : userImage || ""}
      />
    </AIMessage>
  );
}

function KnowledgePanel({
  canManage,
  documents,
  files,
  isUploading,
  onArchive,
  onRetry,
  onUpload,
  setFiles,
  stats,
}: {
  canManage: boolean;
  documents: RagDocument[] | undefined;
  files: File[];
  isUploading: boolean;
  onArchive: (documentId: Id<"documents">) => Promise<void>;
  onRetry: (documentId: Id<"documents">) => Promise<void>;
  onUpload: () => Promise<void>;
  setFiles: (files: File[]) => void;
  stats:
    | { indexed: number; indexing: number; failed: number; uploaded: number }
    | undefined;
}) {
  return (
    <Card className="border bg-card/82 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LibraryIcon />
          Base documental
        </CardTitle>
        <CardDescription>
          Archivos disponibles para que el agente responda con RAG.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Indexados" value={stats?.indexed ?? 0} />
          <Stat label="En proceso" value={stats?.indexing ?? 0} />
        </div>

        {canManage ? (
          <div className="flex flex-col gap-3 rounded-lg border bg-background/70 p-3">
            <Dropzone
              accept={acceptedFiles}
              disabled={isUploading}
              maxFiles={1}
              maxSize={20 * 1024 * 1024}
              onDrop={(accepted) => setFiles(accepted)}
              src={files}
            >
              <DropzoneEmptyState />
              <DropzoneContent />
            </Dropzone>
            <Button disabled={!files.length || isUploading} onClick={onUpload}>
              {isUploading ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <UploadIcon data-icon="inline-start" />
              )}
              Subir e indexar
            </Button>
          </div>
        ) : (
          <Alert>
            <ShieldIcon />
            <AlertTitle>Modo lectura</AlertTitle>
            <AlertDescription>
              Solo Admins y Editores pueden subir documentos.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3">
          {!documents ? (
            <DocumentSkeleton />
          ) : documents.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FolderUpIcon />
                </EmptyMedia>
                <EmptyTitle>No hay documentos todavía</EmptyTitle>
                <EmptyDescription>
                  Sube el primer archivo para activar las respuestas con RAG.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            documents.map((document) => (
              <DocumentItem
                document={document}
                key={document._id}
                onArchive={onArchive}
                onRetry={onRetry}
                showActions={canManage}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentItem({
  document,
  onArchive,
  onRetry,
  showActions,
}: {
  document: RagDocument;
  onArchive: (documentId: Id<"documents">) => Promise<void>;
  onRetry: (documentId: Id<"documents">) => Promise<void>;
  showActions: boolean;
}) {
  const [isBusy, setIsBusy] = useState(false);

  async function runAction(action: () => Promise<void>) {
    setIsBusy(true);
    try {
      await action();
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-background/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <FileTextIcon />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-sm font-semibold">
              {document.title}
            </span>
            <span className="text-xs text-muted-foreground">
              {renderBytes(document.size)} · {formatDate(document.createdAt)}
            </span>
          </div>
        </div>
        <Badge variant={statusVariant(document.status)}>
          {statusLabel(document.status)}
        </Badge>
      </div>
      {document.error ? (
        <p className="text-xs text-destructive">{document.error}</p>
      ) : null}
      {showActions ? (
        <div className="flex items-center gap-2">
          {document.status === "failed" ? (
            <Button
              disabled={isBusy}
              onClick={() => runAction(() => onRetry(document._id))}
              size="sm"
              variant="outline"
            >
              <RefreshCwIcon data-icon="inline-start" />
              Reintentar
            </Button>
          ) : null}
          <Button
            disabled={isBusy}
            onClick={() => runAction(() => onArchive(document._id))}
            size="sm"
            variant="ghost"
          >
            <ArchiveIcon data-icon="inline-start" />
            Archivar
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function TeamPanel({
  onRoleChange,
  users,
}: {
  onRoleChange: (userId: Id<"users">, role: Role) => Promise<void>;
  users: TeamUser[] | undefined;
}) {
  return (
    <Card className="border bg-card/82 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersIcon />
          Equipo
        </CardTitle>
        <CardDescription>
          Administra acceso a documentos y acciones sensibles.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!users ? (
          <DocumentSkeleton />
        ) : (
          users.map((teamUser) => (
            <TeamUserRow
              key={teamUser._id}
              onRoleChange={onRoleChange}
              user={teamUser}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function TeamUserRow({
  onRoleChange,
  user,
}: {
  onRoleChange: (userId: Id<"users">, role: Role) => Promise<void>;
  user: TeamUser;
}) {
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/70 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-9">
          <AvatarImage src={user.imageUrl ?? ""} />
          <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">
            {user.name || user.email || "Usuario"}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {user.email || "Sin correo"}
          </span>
        </div>
      </div>
      <Select
        disabled={isSaving}
        onValueChange={async (value) => {
          setIsSaving(true);
          try {
            await onRoleChange(user._id, value as Role);
          } finally {
            setIsSaving(false);
          }
        }}
        value={user.role}
      >
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="user">Usuario</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-background/70 p-3">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Skeleton className="h-20 w-3/4 rounded-xl" />
      <Skeleton className="ml-auto h-16 w-2/3 rounded-xl" />
      <Skeleton className="h-28 w-4/5 rounded-xl" />
    </div>
  );
}

function DocumentSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <main className="grid min-h-svh place-items-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Preparando dashboard</CardTitle>
          <CardDescription>
            Validando sesión y conectando con Convex.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Spinner />
          <span className="text-sm text-muted-foreground">
            Cargando panel de trabajo...
          </span>
        </CardContent>
      </Card>
    </main>
  );
}

function AuthStatusCard({
  action,
  description,
  title,
}: {
  action: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <main className="grid min-h-svh place-items-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{action}</CardContent>
      </Card>
    </main>
  );
}
