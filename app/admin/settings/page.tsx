"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Settings, Save, Loader2, Building2, Mail, Phone, Calendar, Palette, Upload, CheckCircle2, Image as ImageIcon, X, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import Image from "next/image";

interface SchoolSettings {
  id: string;
  name: string;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  academicYear: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  tier: "BASIC" | "PRO" | "ENTERPRISE";
  featureFlags: string;
  createdAt: string;
  updatedAt: string;
  principalName: string | null;
  registrationNo: string | null;
  udiseCode: string | null;
  receiptPrefix: string | null;
  admissionPrefix: string | null;
  staffIdPrefix: string | null;
  gradingSystem: string | null;
  dateFormat: string | null;
  currency: string | null;
  website: string | null;
  pdfHeader: string | null;
  pdfFooter: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    contactEmail: "",
    contactPhone: "",
    academicYear: "",
    logoUrl: "",
    faviconUrl: "",
    primaryColor: "#2563eb",
    tier: "BASIC" as "BASIC" | "PRO" | "ENTERPRISE",
    principalName: "",
    registrationNo: "",
    udiseCode: "",
    receiptPrefix: "",
    admissionPrefix: "",
    staffIdPrefix: "",
    gradingSystem: "",
    dateFormat: "DD/MM/YYYY",
    currency: "₹ (INR)",
    website: "",
    pdfHeader: "",
    pdfFooter: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setSettings(data);
      setFormData({
        name: data.name || "",
        address: data.address || "",
        contactEmail: data.contactEmail || "",
        contactPhone: data.contactPhone || "",
        academicYear: data.academicYear || "",
        logoUrl: data.logoUrl || "",
        faviconUrl: data.faviconUrl || "",
        primaryColor: data.primaryColor || "#2563eb",
        tier: data.tier || "BASIC",
        principalName: data.principalName || "",
        registrationNo: data.registrationNo || "",
        udiseCode: data.udiseCode || "",
        receiptPrefix: data.receiptPrefix || "",
        admissionPrefix: data.admissionPrefix || "",
        staffIdPrefix: data.staffIdPrefix || "",
        gradingSystem: data.gradingSystem || "",
        dateFormat: data.dateFormat || "DD/MM/YYYY",
        currency: data.currency || "₹ (INR)",
        website: data.website || "",
        pdfHeader: data.pdfHeader || "",
        pdfFooter: data.pdfFooter || "",
      });
    } catch (err) {
      toast.error("Failed to load settings");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save settings");
      }

      const updated = await res.json();
      setSettings(updated);
      toast.success("Settings saved successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="h-8 w-8 text-blue-600" />
            School Settings
          </h1>
          <p className="text-gray-600 mt-2">Manage your school configuration and preferences</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              General Information
            </CardTitle>
            <CardDescription>Basic school details and identification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">School Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="RGD School"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="academicYear">Academic Year</Label>
                <Input
                  id="academicYear"
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  placeholder="2024-2025"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="principalName">Principal Name</Label>
                <Input
                  id="principalName"
                  value={formData.principalName}
                  onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                  placeholder="Dr. John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationNo">Registration Number</Label>
                <Input
                  id="registrationNo"
                  value={formData.registrationNo}
                  onChange={(e) => setFormData({ ...formData, registrationNo: e.target.value })}
                  placeholder="RGD/2024/001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="udiseCode">UDISE Code</Label>
                <Input
                  id="udiseCode"
                  value={formData.udiseCode}
                  onChange={(e) => setFormData({ ...formData, udiseCode: e.target.value })}
                  placeholder="UPXXXXXXXX"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://www.rgdschool.edu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="School Street, Education City"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Contact Information
            </CardTitle>
            <CardDescription>School contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="info@rgdschool.edu"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-blue-600" />
              Appearance
            </CardTitle>
            <CardDescription>Customize the look and feel of your school portal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    placeholder="#2563eb"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tier">Subscription Tier</Label>
                <Select
                  value={formData.tier}
                  onValueChange={(value: "BASIC" | "PRO" | "ENTERPRISE") =>
                    setFormData({ ...formData, tier: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BASIC">Basic</SelectItem>
                    <SelectItem value="PRO">Pro</SelectItem>
                    <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  type="url"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faviconUrl">Favicon URL</Label>
                <Input
                  id="faviconUrl"
                  type="url"
                  value={formData.faviconUrl}
                  onChange={(e) => setFormData({ ...formData, faviconUrl: e.target.value })}
                  placeholder="https://example.com/favicon.ico"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              Document Configuration
            </CardTitle>
            <CardDescription>Configure prefixes for receipts, admissions, and staff IDs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="receiptPrefix">Receipt Prefix</Label>
                <Input
                  id="receiptPrefix"
                  value={formData.receiptPrefix}
                  onChange={(e) => setFormData({ ...formData, receiptPrefix: e.target.value })}
                  placeholder="RCPT-"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admissionPrefix">Admission Number Prefix</Label>
                <Input
                  id="admissionPrefix"
                  value={formData.admissionPrefix}
                  onChange={(e) => setFormData({ ...formData, admissionPrefix: e.target.value })}
                  placeholder="ADM-"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staffIdPrefix">Staff ID Prefix</Label>
                <Input
                  id="staffIdPrefix"
                  value={formData.staffIdPrefix}
                  onChange={(e) => setFormData({ ...formData, staffIdPrefix: e.target.value })}
                  placeholder="STF-"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Academic Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Academic Configuration
            </CardTitle>
            <CardDescription>Configure grading system, date format, and currency</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gradingSystem">Grading System</Label>
                <Input
                  id="gradingSystem"
                  value={formData.gradingSystem}
                  onChange={(e) => setFormData({ ...formData, gradingSystem: e.target.value })}
                  placeholder="A+, A, B+, B, C, D, F"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateFormat">Date Format</Label>
                <Select
                  value={formData.dateFormat}
                  onValueChange={(value) => setFormData({ ...formData, dateFormat: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  placeholder="₹ (INR)"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PDF Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              PDF Configuration
            </CardTitle>
            <CardDescription>Configure header and footer text for generated PDFs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pdfHeader">PDF Header</Label>
              <Textarea
                id="pdfHeader"
                value={formData.pdfHeader}
                onChange={(e) => setFormData({ ...formData, pdfHeader: e.target.value })}
                placeholder="Text that appears on all PDFs as header"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdfFooter">PDF Footer</Label>
              <Textarea
                id="pdfFooter"
                value={formData.pdfFooter}
                onChange={(e) => setFormData({ ...formData, pdfFooter: e.target.value })}
                placeholder="Text that appears on all PDFs as footer"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => fetchSettings()}
            disabled={saving}
          >
            Reset
          </Button>
          <Button type="submit" disabled={saving} className="min-w-[120px]">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Image Management Sections */}
      <ImageManagementSection type="gallery" title="Gallery Images" description="Manage images displayed in the gallery section" />
      <ImageManagementSection type="hero" title="Hero Images" description="Manage images displayed in the hero section" />
    </div>
  );
}

// Image Management Component
function ImageManagementSection({ type, title, description }: { type: "gallery" | "hero"; title: string; description: string }) {
  const [images, setImages] = useState<Array<{ id: string; url: string; category?: string; title: string; description?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    category: "Campus",
    title: "",
    description: "",
  });

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const endpoint = type === "gallery" ? "/api/gallery" : "/api/hero-images";
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed to fetch images");
      const data = await res.json();
      setImages(data.images || []);
    } catch (err) {
      toast.error("Failed to load images");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.title) {
      toast.error("Please select a file and enter a title");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadForm.file);
      formData.append("title", uploadForm.title);
      if (uploadForm.description) formData.append("description", uploadForm.description);
      if (type === "gallery") formData.append("category", uploadForm.category);

      const endpoint = type === "gallery" ? "/api/gallery" : "/api/hero-images";
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to upload image");
      }

      toast.success("Image uploaded successfully!");
      setDialogOpen(false);
      setUploadForm({ file: null, category: "Campus", title: "", description: "" });
      fetchImages();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;

    try {
      const endpoint = type === "gallery" ? "/api/gallery" : "/api/hero-images";
      const res = await fetch(`${endpoint}?id=${imageId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete image");
      }

      toast.success("Image deleted successfully!");
      fetchImages();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete image");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-blue-600" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Image
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload {type === "gallery" ? "Gallery" : "Hero"} Image</DialogTitle>
                <DialogDescription>
                  Upload an image to display on the school website
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Image File *</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setUploadForm({ ...uploadForm, file });
                    }}
                  />
                </div>
                {type === "gallery" && (
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select
                      value={uploadForm.category}
                      onValueChange={(v) => setUploadForm({ ...uploadForm, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Campus">Campus</SelectItem>
                        <SelectItem value="Events">Events</SelectItem>
                        <SelectItem value="Sports">Sports</SelectItem>
                        <SelectItem value="Celebrations">Celebrations</SelectItem>
                        <SelectItem value="Achievements">Achievements</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    placeholder="Image title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No images uploaded yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div key={image.id} className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                <Image
                  src={image.url}
                  alt={image.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(image.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white text-xs font-medium truncate">{image.title}</p>
                  {image.category && (
                    <p className="text-white/70 text-xs">{image.category}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
