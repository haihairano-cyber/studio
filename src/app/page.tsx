'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { gradeExamAction } from '@/app/actions';
import type { TestTemplate, GradingResult, DetailedResult, SavedExam } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { UploadCloud, PlusCircle, Loader2, CheckCircle, XCircle, AlertCircle, BookCopy, FileImage, ClipboardCheck, Trash2, Edit, Plus, X, Camera, RotateCcw, AlertOctagon, Save } from 'lucide-react';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useSettings } from '@/hooks/use-settings';

const questionSchema = z.object({
  points: z.coerce.number().min(0, 'Points must be non-negative.'),
  answer: z.string().min(1, 'An answer must be selected.'),
  options: z.array(z.string()).min(2, 'At least two options are required.'),
});

export default function Home() {
  const [templates, setTemplates] = useState<TestTemplate[]>([]);
  const [savedExams, setSavedExams] = useState<SavedExam[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ grade: GradingResult; details: DetailedResult[] } | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TestTemplate | null>(null);
  const { toast } = useToast();
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | undefined>(undefined);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSaveExamDialogOpen, setIsSaveExamDialogOpen] = useState(false);
  const [studentName, setStudentName] = useState('');
  const { t } = useSettings();

  const templateFormSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, t('templateNameRequired')),
    questions: z.array(questionSchema).min(1, t('atLeastOneQuestion')),
  });

  const defaultQuestion = {
    points: 1,
    answer: 'A',
    options: ['A', 'B', 'C', 'D', 'E'],
  };

  useEffect(() => {
    try {
      const storedTemplates = window.localStorage.getItem('provaFacilTemplates');
      if (storedTemplates) {
        setTemplates(JSON.parse(storedTemplates));
      }
      const storedExams = window.localStorage.getItem('provaFacilSavedExams');
      if (storedExams) {
        setSavedExams(JSON.parse(storedExams));
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
  }, []);

  useEffect(() => {
    if (isCameraOpen) {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: t('cameraAccessDenied'),
            description: t('enableCamera'),
          });
          setIsCameraOpen(false);
        }
      };
      getCameraPermission();
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  }, [isCameraOpen, toast, t]);

  const saveTemplates = (newTemplates: TestTemplate[]) => {
    setTemplates(newTemplates);
    try {
      window.localStorage.setItem('provaFacilTemplates', JSON.stringify(newTemplates));
    } catch (error) {
       console.error("Failed to save templates to localStorage", error);
    }
  };
  
  const saveExams = (newExams: SavedExam[]) => {
    setSavedExams(newExams);
    try {
      window.localStorage.setItem('provaFacilSavedExams', JSON.stringify(newExams));
    } catch (error) {
      console.error("Failed to save exams to localStorage", error);
    }
  };

  const form = useForm<z.infer<typeof templateFormSchema>>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: '',
      questions: [defaultQuestion],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'questions',
  });

  function openEditForm(templateId: string) {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setEditingTemplate(template);
      form.reset({
        id: template.id,
        name: template.name,
        questions: template.answerKey.map((answer, i) => ({
          points: template.points?.[i] ?? 1,
          answer: answer,
          options: ['A', 'B', 'C', 'D', 'E'],
        }))
      });
      setIsFormOpen(true);
    }
  }

  function openNewForm() {
    setEditingTemplate(null);
    form.reset({
      id: undefined,
      name: '',
      questions: [defaultQuestion],
    });
    setIsFormOpen(true);
  }


  function onSubmit(values: z.infer<typeof templateFormSchema>) {
    const newTemplate: TestTemplate = {
      id: values.id || uuidv4(),
      name: values.name,
      answerKey: values.questions.map(q => q.answer),
      points: values.questions.map(q => q.points),
    };

    let updatedTemplates;
    if (values.id) {
      updatedTemplates = templates.map(t => t.id === values.id ? newTemplate : t);
      toast({ title: t('success'), description: t('templateUpdated') });
    } else {
      updatedTemplates = [...templates, newTemplate];
      toast({ title: t('success'), description: t('templateCreated') });
    }
    
    saveTemplates(updatedTemplates);
    form.reset();
    setIsFormOpen(false);
    setSelectedTemplateId(newTemplate.id);
  }
  
  const handleDeleteTemplate = (templateId: string) => {
    const updatedTemplates = templates.filter(t => t.id !== templateId);
    saveTemplates(updatedTemplates);
    if (selectedTemplateId === templateId) {
        setSelectedTemplateId(templates.length > 1 ? templates.filter(t => t.id !== templateId)[0].id : '');
    }
    toast({
      title: t('success'),
      description: t('templateDeleted'),
    });
  }
  
  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setResults(null);
  }

  const handleImageDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFile(event.dataTransfer.files[0]);
    }
  }, []);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      handleFile(event.target.files[0]);
    }
  };

  const takePicture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg');
        setImage(dataUri);
        setResults(null);
      }
      setIsCameraOpen(false);
    }
  };

  const handleGrade = async () => {
    if (!image || !selectedTemplateId) return;
    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    setIsProcessing(true);
    setResults(null);

    try {
      const result = await gradeExamAction(image, template.answerKey, template.points);
      if (result && result.grade) {
        setResults(result);
      } else {
        throw new Error(t('invalidAIResponse'));
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: t('gradingError'),
        description: t('imageProcessingError'),
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleSaveExam = () => {
    if (!results || !studentName || !image || !selectedTemplate) {
      toast({
        variant: 'destructive',
        title: t('saveError'),
        description: t('fillStudentName'),
      });
      return;
    }

    const newSavedExam: SavedExam = {
      id: uuidv4(),
      studentName,
      templateName: selectedTemplate.name,
      grade: results.grade,
      details: results.details,
      image,
      correctionDate: new Date().toISOString(),
    };

    saveExams([newSavedExam, ...savedExams]);
    toast({
      title: t('correctionSaved'),
      description: t('examSavedSuccess', { studentName }),
    });
    setIsSaveExamDialogOpen(false);
    setStudentName('');
  };
  
  const handleDeleteSavedExam = (examId: string) => {
    const updatedExams = savedExams.filter(exam => exam.id !== examId);
    saveExams(updatedExams);
    toast({
      title: t('correctionDeleted'),
      description: t('correctionDeletedSuccess'),
    });
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card className="shadow-lg animation-fade-in-up bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookCopy className="w-8 h-8 text-primary" />
                  <div>
                    <CardTitle className="text-2xl font-headline">{t('step1')}</CardTitle>
                    <CardDescription>{t('step1Desc')}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Edit className="mr-2 h-4 w-4" /> {t('manage')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('manageTemplates')}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
                        {templates.map(template => (
                          <div key={template.id} className="flex items-center justify-between p-2 rounded-md border">
                            <span>{template.name}</span>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEditForm(template.id)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                   <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                   </Button>
                                </AlertDialogTrigger>
                                 <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {t('deleteTemplateWarning')}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteTemplate(template.id)}>{t('delete')}</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                         {templates.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t('noTemplatesFound')}</p>}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button onClick={openNewForm}>
                    <PlusCircle className="mr-2 h-4 w-4" /> {t('createNew')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {templates.length > 0 ? (
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectTemplate')} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('noTemplatesFound')}</AlertTitle>
                  <AlertDescription>
                    {t('createFirstTemplate')}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? t('edit') : t('createNew')} {t('template')}</DialogTitle>
                <DialogDescription>
                  {t('fillTemplateInfo')}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-grow overflow-hidden flex flex-col">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('templateName')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('templateNamePlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-6">
                    <h3 className="text-lg font-medium">{t('questions')}</h3>
                    {fields.map((field, index) => (
                      <Card key={field.id} className="relative p-4">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={() => remove(index)}
                            disabled={fields.length <= 1}
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        <div className="flex gap-4 items-start">
                          <div className="font-bold text-lg">{index + 1}.</div>
                          <div className="flex-grow space-y-4">
                            <FormField
                              control={form.control}
                              name={`questions.${index}.answer`}
                              render={({ field: radioField }) => (
                                <FormItem>
                                  <FormLabel>{t('correctAnswer')}</FormLabel>
                                  <FormControl>
                                    <RadioGroup
                                      onValueChange={radioField.onChange}
                                      defaultValue={radioField.value}
                                      className="flex flex-wrap gap-4"
                                    >
                                      {form.watch(`questions.${index}.options`).map((option) => (
                                        <FormItem key={option} className="flex items-center space-x-2">
                                          <FormControl>
                                            <RadioGroupItem value={option} id={`${field.id}-${option}`}/>
                                          </FormControl>
                                          <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
                                        </FormItem>
                                      ))}
                                    </RadioGroup>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`questions.${index}.points`}
                              render={({ field: pointsField }) => (
                                <FormItem>
                                  <FormLabel>{t('points')}</FormLabel>
                                  <FormControl>
                                    <Input type="number" step="0.5" {...pointsField} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                     <Button type="button" variant="outline" onClick={() => append(defaultQuestion)}>
                        <Plus className="mr-2 h-4 w-4" /> {t('addQuestion')}
                    </Button>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="ghost">{t('cancel')}</Button></DialogClose>
                    <Button type="submit">{t('saveTemplate')}</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {selectedTemplate && (
            <Card className="shadow-lg animation-fade-in-up bg-card/80 backdrop-blur-sm" style={{animationDelay: '0.1s'}}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <FileImage className="w-8 h-8 text-primary" />
                  <div>
                    <CardTitle className="text-2xl font-headline">{t('step2')}</CardTitle>
                    <CardDescription>{t('step2Desc')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div 
                  className="relative flex items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onDrop={handleImageDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  {image ? (
                    <Image src={image} alt="Preview" fill className="object-contain rounded-lg p-2" />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <UploadCloud className="mx-auto h-12 w-12" />
                      <p className="mt-2 font-semibold">{t('uploadOrDrag')}</p>
                      <p className="text-xs">{t('imageFormats')}</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <Button onClick={() => document.getElementById('file-upload')?.click()} className="w-full">
                       <UploadCloud className="mr-2 h-4 w-4" /> {t('uploadFile')}
                   </Button>
                   <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
                     <DialogTrigger asChild>
                       <Button variant="outline" className="w-full">
                         <Camera className="mr-2 h-4 w-4" /> {t('useCamera')}
                       </Button>
                     </DialogTrigger>
                     <DialogContent className="max-w-xl">
                       <DialogHeader>
                         <DialogTitle>{t('takePhoto')}</DialogTitle>
                       </DialogHeader>
                       <div className="space-y-4">
                         <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted />
                          {hasCameraPermission === false && (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>{t('cameraNotAccessible')}</AlertTitle>
                              <AlertDescription>
                                {t('allowCameraAccess')}
                              </AlertDescription>
                            </Alert>
                          )}
                       </div>
                       <DialogFooter>
                         <Button variant="secondary" onClick={() => setIsCameraOpen(false)}>{t('cancel')}</Button>
                         <Button onClick={takePicture} disabled={!hasCameraPermission}>
                            <Camera className="mr-2 h-4 w-4" /> {t('takePhoto')}
                         </Button>
                       </DialogFooter>
                     </DialogContent>
                   </Dialog>
                </div>
                 {image && (
                  <Button variant="outline" onClick={() => { setImage(null); setResults(null); }} className="w-full">
                    <RotateCcw className="mr-2 h-4 w-4" /> {t('clearImage')}
                  </Button>
                )}
                <Button onClick={handleGrade} disabled={!image || isProcessing} className="w-full">
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isProcessing ? t('grading') : t('gradeExam')}
                </Button>
              </CardContent>
            </Card>
          )}

          {isProcessing && (
            <div className="flex justify-center items-center p-8">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
          )}

          {results && (
            <Card className="shadow-lg animation-fade-in-up bg-card/80 backdrop-blur-sm" style={{animationDelay: '0.2s'}}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ClipboardCheck className="w-8 h-8 text-primary" />
                    <div>
                      <CardTitle className="text-2xl font-headline">{t('step3')}</CardTitle>
                      <CardDescription>{t('step3Desc')}</CardDescription>
                    </div>
                  </div>
                   <Dialog open={isSaveExamDialogOpen} onOpenChange={setIsSaveExamDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Save className="mr-2 h-4 w-4" /> {t('saveCorrection')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('saveCorrection')}</DialogTitle>
                        <DialogDescription>{t('saveCorrectionDesc')}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Label htmlFor="studentName">{t('studentName')}</Label>
                        <Input 
                          id="studentName"
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          placeholder={t('studentNamePlaceholder')}
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsSaveExamDialogOpen(false)}>{t('cancel')}</Button>
                        <Button onClick={handleSaveExam}>{t('save')}</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">{t('scoreSummary')}</h3>
                  <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{t('finalScore')} ({results.grade.earnedPoints} / {results.grade.totalPoints} {t('pts')})</span>
                        <span className="font-bold text-primary">{results.grade.score.toFixed(1)}%</span>
                      </div>
                      <Progress value={results.grade.score} className="h-2" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-background/50 rounded-md">
                            <p className="text-sm text-muted-foreground">{t('totalQuestions')}</p>
                            <p className="text-2xl font-bold">{results.grade.totalQuestions}</p>
                        </div>
                        <div className="p-3 bg-background/50 rounded-md">
                            <p className="text-sm text-muted-foreground">{t('correct')}</p>
                            <p className="text-2xl font-bold text-green-400">{results.grade.correctAnswers}</p>
                        </div>
                        <div className="p-3 bg-background/50 rounded-md">
                            <p className="text-sm text-muted-foreground">{t('incorrectVoided')}</p>
                            <p className="text-2xl font-bold text-destructive">{results.grade.incorrectAnswers}</p>
                        </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">{t('detailedAnswers')}</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">{t('question')}</TableHead>
                          <TableHead>{t('studentAnswer')}</TableHead>
                          <TableHead>{t('answerKey')}</TableHead>
                          <TableHead>{t('points')}</TableHead>
                          <TableHead className="text-right">{t('result')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.details.map((item) => (
                          <TableRow key={item.question} className={!item.isCorrect ? (item.studentAnswer === 'ANULADA' ? 'bg-amber-400/20' : 'bg-destructive/20') : ''}>
                            <TableCell className="font-medium">{item.question}</TableCell>
                            <TableCell>{item.studentAnswer || '-'}</TableCell>
                            <TableCell>{item.correctAnswer}</TableCell>
                            <TableCell>{item.points}</TableCell>
                            <TableCell className="text-right">
                              {item.studentAnswer === 'ANULADA' ? (
                                <AlertOctagon className="h-5 w-5 text-amber-400 inline-block" />
                              ) : item.isCorrect ? (
                                <CheckCircle className="h-5 w-5 text-green-400 inline-block" />
                              ) : (
                                <XCircle className="h-5 w-5 text-destructive inline-block" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {savedExams.length > 0 && (
            <Card className="shadow-lg animation-fade-in-up bg-card/80 backdrop-blur-sm" style={{animationDelay: '0.3s'}}>
              <CardHeader>
                  <CardTitle className="text-2xl font-headline">{t('savedCorrections')}</CardTitle>
                  <CardDescription>{t('savedCorrectionsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                 <Accordion type="single" collapsible className="w-full">
                    {savedExams.map((exam) => (
                      <AccordionItem value={exam.id} key={exam.id}>
                        <AccordionTrigger>
                          <div className="flex justify-between w-full pr-4">
                            <span className='font-bold'>{exam.studentName}</span>
                            <span className='text-sm text-muted-foreground'>{new Date(exam.correctionDate).toLocaleDateString(t.language)}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-6">
                           <div className="flex flex-col md:flex-row gap-6">
                              <div className="w-full md:w-1/3">
                                <h4 className="font-semibold mb-2">{t('answerSheet')}</h4>
                                 <div className="relative aspect-[3/4] rounded-md overflow-hidden border">
                                    <Image src={exam.image} alt={`Prova de ${exam.studentName}`} fill className="object-contain" />
                                 </div>
                              </div>
                              <div className="w-full md:w-2/3 space-y-4">
                                <h4 className="font-semibold">{t('summary')}</h4>
                                 <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                                    <div>
                                      <div className="flex justify-between mb-1">
                                        <span className="font-medium">{t('finalScore')} ({exam.grade.earnedPoints} / {exam.grade.totalPoints} {t('pts')})</span>
                                        <span className="font-bold text-primary">{exam.grade.score.toFixed(1)}%</span>
                                      </div>
                                      <Progress value={exam.grade.score} className="h-2" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                      <div className="p-2 bg-background/50 rounded-md">
                                        <p className="text-xs text-muted-foreground">{t('correct')}</p>
                                        <p className="text-lg font-bold text-green-400">{exam.grade.correctAnswers}</p>
                                      </div>
                                      <div className="p-2 bg-background/50 rounded-md">
                                        <p className="text-xs text-muted-foreground">{t('incorrect')}</p>
                                        <p className="text-lg font-bold text-destructive">{exam.grade.incorrectAnswers}</p>
                                      </div>
                                      <div className="p-2 bg-background/50 rounded-md">
                                        <p className="text-xs text-muted-foreground">{t('total')}</p>
                                        <p className="text-lg font-bold">{exam.grade.totalQuestions}</p>
                                      </div>
                                    </div>
                                 </div>
                                <h4 className="font-semibold">{t('detailedAnswers')}</h4>
                                 <div className="border rounded-lg overflow-auto max-h-60">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Q</TableHead>
                                        <TableHead>{t('student')}</TableHead>
                                        <TableHead>{t('answerKey')}</TableHead>
                                        <TableHead className='text-right'>{t('result')}</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {exam.details.map((item) => (
                                        <TableRow key={item.question} className={!item.isCorrect ? (item.studentAnswer === 'ANULADA' ? 'bg-amber-400/20' : 'bg-destructive/20') : ''}>
                                          <TableCell>{item.question}</TableCell>
                                          <TableCell>{item.studentAnswer || '-'}</TableCell>
                                          <TableCell>{item.correctAnswer}</TableCell>
                                          <TableCell className="text-right">
                                            {item.studentAnswer === 'ANULADA' ? <AlertOctagon className="h-5 w-5 text-amber-400 inline-block" /> : item.isCorrect ? <CheckCircle className="h-5 w-5 text-green-400 inline-block" /> : <XCircle className="h-5 w-5 text-destructive inline-block" />}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                           </div>
                           <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="mr-2 h-4 w-4" /> {t('deleteCorrection')}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('deleteCorrectionWarning', { studentName: exam.studentName })}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteSavedExam(exam.id)}>{t('delete')}</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                 </Accordion>
              </CardContent>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}

    