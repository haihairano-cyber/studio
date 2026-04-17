'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { gradeExamAction, extractAnswersFromKeyImageAction } from '@/app/actions';
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
import { UploadCloud, PlusCircle, Loader2, CheckCircle, XCircle, AlertCircle, BookCopy, FileImage, ClipboardCheck, Trash2, Edit, Plus, X, Camera, RotateCcw, AlertOctagon, Save, RefreshCw, ScanLine } from 'lucide-react';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const templateFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'O nome do gabarito é obrigatório.'),
  questions: z.array(
    z.object({
      points: z.coerce.number().min(0, 'A pontuação deve ser não-negativa.'),
      answer: z.string().min(1, 'Uma resposta deve ser selecionada.'),
      options: z.array(z.string()).min(2, 'São necessárias pelo menos duas opções.'),
    })
  ).min(1, 'É necessário ter pelo menos uma questão.'),
});

const defaultQuestion = {
  points: 1,
  answer: 'A',
  options: ['A', 'B', 'C', 'D', 'E'],
};

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
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [templateImage, setTemplateImage] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

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
  
  const getCamera = useCallback(async () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Acesso à câmera negado',
        description: 'Por favor, habilite o acesso à câmera nas configurações do seu navegador.',
      });
      setIsCameraOpen(false);
    }
  }, [facingMode, toast]);

  useEffect(() => {
    if (isCameraOpen) {
      getCamera();
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  }, [isCameraOpen, getCamera]);

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
  
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'questions',
  });

  function openEditForm(templateId: string) {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setTemplateImage(null);
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
    setTemplateImage(null);
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
      toast({ title: 'Sucesso!', description: 'Gabarito atualizado com sucesso.' });
    } else {
      updatedTemplates = [...templates, newTemplate];
      toast({ title: 'Sucesso!', description: 'Gabarito criado com sucesso.' });
    }
    
    saveTemplates(updatedTemplates);
    form.reset();
    setIsFormOpen(false);
    setTemplateImage(null);
    setSelectedTemplateId(newTemplate.id);
  }
  
  const handleDeleteTemplate = (templateId: string) => {
    const updatedTemplates = templates.filter(t => t.id !== templateId);
    saveTemplates(updatedTemplates);
    if (selectedTemplateId === templateId) {
        setSelectedTemplateId(templates.length > 1 ? templates.filter(t => t.id !== templateId)[0].id : '');
    }
    toast({
      title: 'Sucesso!',
      description: 'Gabarito apagado com sucesso.',
    });
  }
  
  const handleFile = (file: File) => {
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            setImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    }
    setResults(null);
  }

  const handleTemplateFile = (file: File) => {
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = (e) => {
            setTemplateImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    }
  }

  const handleExtractFromImage = async () => {
    if (!templateImage) return;
    setIsExtracting(true);
    try {
      const extractedAnswers = await extractAnswersFromKeyImageAction(templateImage);
      if (extractedAnswers && extractedAnswers.length > 0) {
        const newQuestions = extractedAnswers.map(answer => ({
          ...defaultQuestion,
          answer: ['A', 'B', 'C', 'D', 'E'].includes(answer) ? answer : 'A', // Fallback
        }));
        replace(newQuestions);
        toast({
          title: 'Gabarito Extraído!',
          description: `${extractedAnswers.length} questões foram preenchidas a partir da imagem.`
        });
      } else {
        throw new Error('Nenhuma resposta pôde ser extraída.');
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro na Extração',
        description: 'Não foi possível processar a imagem do gabarito. Tente novamente.',
      });
    } finally {
      setIsExtracting(false);
    }
  };


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
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg', 0.85);

        if(isFormOpen) {
          setTemplateImage(dataUri);
        } else {
          setImage(dataUri);
          setResults(null);
        }
      }
      setIsCameraOpen(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'Câmera não pronta',
        description: 'Aguarde o vídeo carregar antes de tirar a foto.',
      });
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
        toast({
          title: 'Correção concluída!',
          description: `Score: ${result.grade.score.toFixed(1)}%`,
        });
      } else {
        throw new Error('A resposta da IA foi inválida.');
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro na Correção',
        description: 'Não foi possível ler o cartão. Tente uma foto mais nítida e bem iluminada.',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleSaveExam = () => {
    if (!results || !studentName || !image || !selectedTemplate) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: 'Preencha o nome do aluno para salvar a correção.',
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
      title: 'Correção Salva!',
      description: `A prova de ${studentName} foi salva com sucesso.`,
    });
    setIsSaveExamDialogOpen(false);
    setStudentName('');
  };
  
  const handleDeleteSavedExam = (examId: string) => {
    const updatedExams = savedExams.filter(exam => exam.id !== examId);
    saveExams(updatedExams);
    toast({
      title: 'Correção Apagada',
      description: 'A correção foi apagada com sucesso.',
    });
  };

  const toggleCameraFacingMode = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card className="shadow-lg animation-fade-in-up border-primary/20">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary rounded-lg text-primary-foreground shadow-md">
                    <BookCopy className="w-8 h-8" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Passo 1: Gabarito</CardTitle>
                    <CardDescription>Selecione um gabarito para começar.</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Edit className="mr-2 h-4 w-4" /> Gerenciar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Gerenciar Gabaritos</DialogTitle>
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
                                      <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Essa ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteTemplate(template.id)}>Apagar</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button onClick={openNewForm} className="shadow-md">
                    <PlusCircle className="mr-2 h-4 w-4" /> Criar Novo
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {templates.length > 0 ? (
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um gabarito..." />
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
                  <AlertTitle>Nenhum gabarito encontrado.</AlertTitle>
                  <AlertDescription>
                    Crie seu primeiro gabarito para começar.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? 'Editar' : 'Criar Novo'} Gabarito</DialogTitle>
                <DialogDescription>
                  Preencha os dados ou extraia de uma imagem.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-grow overflow-hidden flex flex-col">
                   <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Gabarito</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Prova de Biologia" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div>
                        <Label>Extrair de imagem (opcional)</Label>
                        <div 
                          className="relative flex items-center justify-center w-full h-32 mt-2 border-2 border-dashed border-muted rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => document.getElementById('template-file-upload')?.click()}
                        >
                          <input id="template-file-upload" type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleTemplateFile(e.target.files[0])} />
                          {templateImage ? (
                            <Image src={templateImage} alt="Preview do Gabarito" fill className="object-contain rounded-lg p-2" />
                          ) : (
                            <div className="text-center text-muted-foreground">
                              <UploadCloud className="mx-auto h-8 w-8" />
                              <p className="mt-1 text-xs">Clique para enviar</p>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                           <Button type="button" onClick={() => document.getElementById('template-file-upload')?.click()} variant="outline" size="sm">
                               <UploadCloud className="mr-2 h-4 w-4" /> Arquivo
                           </Button>
                           <Button variant="outline" size="sm" onClick={() => { setIsCameraOpen(true); }}>
                             <Camera className="mr-2 h-4 w-4" /> Câmera
                           </Button>
                        </div>
                        {templateImage && (
                          <Button onClick={handleExtractFromImage} disabled={isExtracting} className="w-full mt-2" size="sm">
                            {isExtracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Extrair Gabarito'}
                          </Button>
                        )}
                    </div>
                  </div>

                  <div className="flex-grow overflow-y-auto pr-2 space-y-4 border-t pt-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Questões</h3>
                    {fields.map((field, index) => (
                      <Card key={field.id} className="relative p-3">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 text-destructive"
                            onClick={() => remove(index)}
                            disabled={fields.length <= 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        <div className="flex gap-4 items-start">
                          <div className="font-bold">{index + 1}.</div>
                          <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`questions.${index}.answer`}
                              render={({ field: radioField }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Resposta</FormLabel>
                                  <FormControl>
                                    <RadioGroup
                                      onValueChange={radioField.onChange}
                                      defaultValue={radioField.value}
                                      className="flex flex-wrap gap-2"
                                    >
                                      {['A', 'B', 'C', 'D', 'E'].map((option) => (
                                        <FormItem key={option} className="flex items-center space-x-1">
                                          <FormControl>
                                            <RadioGroupItem value={option} id={`${field.id}-${option}`}/>
                                          </FormControl>
                                          <Label htmlFor={`${field.id}-${option}`} className="text-xs">{option}</Label>
                                        </FormItem>
                                      ))}
                                    </RadioGroup>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`questions.${index}.points`}
                              render={({ field: pointsField }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Pontos</FormLabel>
                                  <FormControl>
                                    <Input type="number" step="0.5" {...pointsField} className="h-8" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                     <Button type="button" variant="outline" size="sm" onClick={() => append(defaultQuestion)} className="w-full">
                        <Plus className="mr-2 h-4 w-4" /> Adicionar Questão
                    </Button>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                    <Button type="submit">Salvar</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {selectedTemplate && (
            <Card className="shadow-lg animation-fade-in-up border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                   <div className="p-3 bg-primary rounded-lg text-primary-foreground shadow-md">
                    <FileImage className="w-8 h-8" />
                   </div>
                  <div>
                    <CardTitle className="text-2xl">Passo 2: Escanear Cartão</CardTitle>
                    <CardDescription>Envie ou tire uma foto do cartão de respostas preenchido.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div 
                  className="relative flex items-center justify-center w-full min-h-[300px] border-2 border-dashed border-muted rounded-xl cursor-pointer hover:bg-muted/30 transition-all overflow-hidden"
                  onDrop={handleImageDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  {image ? (
                    <div className="relative w-full h-full min-h-[300px]">
                      <Image src={image} alt="Preview" fill className="object-contain p-2" />
                      {isProcessing && (
                        <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px]">
                          <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_15px_#64B5F6] animate-scan" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="mt-2 font-medium">Arraste ou clique para enviar</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <Button onClick={() => document.getElementById('file-upload')?.click()} variant="outline">
                       <UploadCloud className="mr-2 h-4 w-4" /> Galeria
                   </Button>
                   <Button variant="outline" onClick={() => setIsCameraOpen(true)}>
                      <Camera className="mr-2 h-4 w-4" /> Câmera
                   </Button>
                </div>
                {image && !isProcessing && (
                  <Button variant="ghost" onClick={() => { setImage(null); setResults(null); }} className="w-full text-destructive">
                    <RotateCcw className="mr-2 h-4 w-4" /> Trocar Imagem
                  </Button>
                )}
                <Button 
                  onClick={handleGrade} 
                  disabled={!image || isProcessing} 
                  size="lg"
                  className="w-full text-lg h-14"
                >
                  {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ScanLine className="mr-2 h-5 w-5" />}
                  {isProcessing ? 'Corrigindo...' : 'Corrigir Agora'}
                </Button>
              </CardContent>
            </Card>
          )}

          <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Tirar Foto</DialogTitle>
                <DialogDescription>Aponte para o cartão de respostas e mantenha estável.</DialogDescription>
              </DialogHeader>
              <div className="relative aspect-[3/4] rounded-lg bg-black overflow-hidden">
                <video 
                  ref={videoRef} 
                  className="w-full h-full object-cover" 
                  autoPlay 
                  muted 
                  playsInline 
                />
                <div className="absolute inset-4 border-2 border-white/30 rounded-lg pointer-events-none border-dashed" />
              </div>
              <DialogFooter className="flex justify-between sm:justify-between items-center">
                <Button variant="outline" size="icon" onClick={toggleCameraFacingMode}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setIsCameraOpen(false)}>Cancelar</Button>
                  <Button onClick={takePicture} disabled={!hasCameraPermission} size="lg">
                    <Camera className="mr-2 h-5 w-5" /> Capturar
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {results && (
            <Card className="shadow-lg animation-fade-in-up border-accent/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="p-3 bg-accent rounded-lg text-accent-foreground shadow-md">
                        <ClipboardCheck className="w-8 h-8" />
                     </div>
                    <div>
                      <CardTitle className="text-2xl">Resultados</CardTitle>
                      <CardDescription>Confira o desempenho detalhado.</CardDescription>
                    </div>
                  </div>
                   <Dialog open={isSaveExamDialogOpen} onOpenChange={setIsSaveExamDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Save className="mr-2 h-4 w-4" /> Salvar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Salvar Correção</DialogTitle>
                        <DialogDescription>Digite o nome do aluno.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Label htmlFor="studentName">Nome do Aluno</Label>
                        <Input 
                          id="studentName"
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          placeholder="Ex: Maria Oliveira"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsSaveExamDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveExam}>Salvar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-muted/30 rounded-xl space-y-4 border">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="font-semibold text-lg">{results.grade.earnedPoints.toFixed(1)} / {results.grade.totalPoints.toFixed(1)} pts</span>
                        <span className="font-bold text-xl text-primary">{results.grade.score.toFixed(1)}%</span>
                      </div>
                      <Progress value={results.grade.score} className="h-3" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-card rounded-lg text-center shadow-sm">
                            <p className="text-[10px] uppercase text-muted-foreground mb-1">Total</p>
                            <p className="text-xl font-bold">{results.grade.totalQuestions}</p>
                        </div>
                        <div className="p-3 bg-card rounded-lg text-center shadow-sm">
                            <p className="text-[10px] uppercase text-muted-foreground mb-1">Acertos</p>
                            <p className="text-xl font-bold text-green-600">{results.grade.correctAnswers}</p>
                        </div>
                        <div className="p-3 bg-card rounded-lg text-center shadow-sm">
                            <p className="text-[10px] uppercase text-muted-foreground mb-1">Erros</p>
                            <p className="text-xl font-bold text-destructive">{results.grade.incorrectAnswers}</p>
                        </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Detalhamento por Questão</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">Nº</TableHead>
                          <TableHead>Resposta</TableHead>
                          <TableHead>Gabarito</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.details.map((item) => (
                          <TableRow key={item.question} className={!item.isCorrect ? 'bg-destructive/5' : ''}>
                            <TableCell className="font-bold">{item.question}</TableCell>
                            <TableCell className={item.studentAnswer === 'ANULADA' ? 'text-amber-600 font-medium' : ''}>
                              {item.studentAnswer || '-'}
                            </TableCell>
                            <TableCell className="font-medium">{item.correctAnswer}</TableCell>
                            <TableCell className="text-right">
                              {item.studentAnswer === 'ANULADA' ? (
                                <AlertCircle className="h-5 w-5 text-amber-500 inline-block" />
                              ) : item.isCorrect ? (
                                <CheckCircle className="h-5 w-5 text-green-500 inline-block" />
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
            <Card className="shadow-lg border-muted/50">
              <CardHeader>
                  <CardTitle className="text-xl">Histórico de Correções</CardTitle>
              </CardHeader>
              <CardContent>
                 <Accordion type="single" collapsible className="w-full">
                    {savedExams.map((exam) => (
                      <AccordionItem value={exam.id} key={exam.id} className="border-b-0 mb-2">
                        <AccordionTrigger className="hover:no-underline bg-muted/20 px-4 rounded-lg">
                          <div className="flex justify-between w-full pr-4 text-left">
                            <span className="font-bold truncate max-w-[150px] sm:max-w-none">{exam.studentName}</span>
                            <span className="text-sm font-bold text-primary">{exam.grade.score.toFixed(0)}%</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 px-4 pb-4 border rounded-b-lg -mt-2">
                           <div className="flex flex-col md:flex-row gap-6">
                              <div className="w-full md:w-1/3 space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Cartão Resposta</p>
                                <div className="relative aspect-[3/4] rounded-md overflow-hidden border shadow-inner bg-muted/10">
                                  <Image src={exam.image} alt="Prova" fill className="object-contain" />
                                </div>
                              </div>
                              <div className="w-full md:w-2/3 space-y-4">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase">Resumo da Avaliação</p>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-destructive h-8 w-8">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Apagar correção?</AlertDialogTitle>
                                        <AlertDialogDescription>Esta ação é irreversível.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteSavedExam(exam.id)}>Confirmar</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                                 <div className="p-3 bg-muted/30 rounded-lg space-y-3 border">
                                    <div className="flex justify-between">
                                      <span className="font-bold text-lg">{exam.grade.score.toFixed(1)}%</span>
                                      <span className="text-sm text-muted-foreground">{new Date(exam.correctionDate).toLocaleDateString()}</span>
                                    </div>
                                    <Progress value={exam.grade.score} className="h-2" />
                                 </div>
                                 <div className="max-h-48 overflow-auto border rounded-md">
                                  <Table>
                                    <TableBody>
                                      {exam.details.map((item) => (
                                        <TableRow key={item.question} className="h-8">
                                          <TableCell className="py-1 font-bold text-xs">{item.question}</TableCell>
                                          <TableCell className="py-1 text-xs">{item.studentAnswer}</TableCell>
                                          <TableCell className="py-1 text-xs font-medium">{item.correctAnswer}</TableCell>
                                          <TableCell className="py-1 text-right">
                                            {item.isCorrect ? <CheckCircle className="h-3 w-3 text-green-500 inline-block" /> : <XCircle className="h-3 w-3 text-destructive inline-block" />}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                           </div>
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