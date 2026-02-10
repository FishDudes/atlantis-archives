import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDocumentSchema, CATEGORIES } from "@shared/schema";
import { useCreateDocument } from "@/hooks/use-documents";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

export function CreateDocumentDialog() {
  const [open, setOpen] = useState(false);
  const createDocument = useCreateDocument();
  const { isAdmin } = useAuth();
  const [roleInput, setRoleInput] = useState("");

  const { data: availableRoles } = useQuery<string[]>({
    queryKey: ["/api/auth/available-roles"],
    queryFn: async () => {
      const res = await fetch("/api/auth/available-roles", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const form = useForm<any>({
    resolver: zodResolver(insertDocumentSchema),
    defaultValues: {
      title: "",
      content: "",
      category: "guidelines",
      isPublic: false,
      allowedRoles: [] as string[],
      googleDocUrl: "",
    },
  });

  if (!isAdmin) return null;

  const onSubmit = (data: any) => {
    const submitData = {
      ...data,
      allowedRoles: data.allowedRoles?.length > 0 ? data.allowedRoles : null,
    };
    createDocument.mutate(submitData, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  };

  const addRole = (role: string) => {
    const current = form.getValues("allowedRoles") || [];
    if (!current.includes(role)) {
      form.setValue("allowedRoles", [...current, role]);
    }
    setRoleInput("");
  };

  const removeRole = (role: string) => {
    const current = form.getValues("allowedRoles") || [];
    form.setValue("allowedRoles", current.filter((r: string) => r !== role));
  };

  const filteredRoles = availableRoles?.filter(
    (r) => r.toLowerCase().includes(roleInput.toLowerCase()) && !(form.getValues("allowedRoles") || []).includes(r)
  ) || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20" data-testid="button-new-document">
          <Plus className="w-4 h-4 mr-2" /> New Document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-card border-white/10 text-card-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-primary">Create New Entry</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Add a new document to the Atlantis Archives.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/90">Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Operation Deep Dive" 
                      className="bg-background/50 border-white/10 focus:border-primary/50"
                      data-testid="input-document-title"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/90">Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50 border-white/10" data-testid="select-category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value} data-testid={`option-category-${cat.value}`}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-1 rounded-lg border border-white/10 bg-background/50 p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-foreground/90">Public Access</FormLabel>
                      <FormDescription className="text-xs">
                        Visible to all members?
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-public"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="allowedRoles"
              render={() => (
                <FormItem>
                  <FormLabel className="text-foreground/90">Restrict to Specific Roles (Optional)</FormLabel>
                  <FormDescription className="text-xs">
                    Leave empty to allow all roles with category access. Add roles to restrict to only those roles.
                  </FormDescription>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {(form.getValues("allowedRoles") || []).map((role: string) => (
                        <Badge key={role} variant="secondary" className="gap-1">
                          {role}
                          <button type="button" onClick={() => removeRole(role)}>
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="relative">
                      <Input
                        placeholder="Search Discord roles..."
                        className="bg-background/50 border-white/10 focus:border-primary/50"
                        value={roleInput}
                        onChange={(e) => setRoleInput(e.target.value)}
                        data-testid="input-role-search"
                      />
                      {roleInput && filteredRoles.length > 0 && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-white/10 rounded-md shadow-lg max-h-40 overflow-y-auto">
                          {filteredRoles.slice(0, 10).map((role) => (
                            <button
                              key={role}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 text-foreground"
                              onClick={() => addRole(role)}
                              data-testid={`option-role-${role}`}
                            >
                              {role}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="googleDocUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/90">Google Doc Link (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://docs.google.com/document/d/..." 
                      className="bg-background/50 border-white/10 focus:border-primary/50"
                      data-testid="input-google-doc-url"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Link a public Google Doc to import its content.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/90">Content</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      content={field.value}
                      onChange={field.onChange}
                      placeholder="Enter document content here..."
                      data-testid="textarea-content"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Paste from Google Docs to preserve formatting, or use the toolbar above.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={createDocument.isPending}
                className="w-full sm:w-auto bg-primary text-primary-foreground font-semibold"
                data-testid="button-submit-document"
              >
                {createDocument.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Archiving...
                  </>
                ) : (
                  "Create Document"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
