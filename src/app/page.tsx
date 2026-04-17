
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
import { UploadCloud, PlusCircle, Loader2, CheckCircle, XCircle, AlertCircle, BookCopy, FileImage, ClipboardCheck, Trash2, Edit, Plus, X, Camera, RotateCcw, Save, RefreshCw, ScanLine } from 'lucide-react';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';

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
      if (storedTemplates) setTemplates(JSON.parse(storedTemplates));
      
      const storedExams = window.localStorage.getItem('provaFacilSavedExams');
      if (storedExams) setSavedExams(JSON.parse(storedExams));
    } catch (error) {
      console.error("Erro ao carregar dados locais:", error);
    }
  }, []);
  
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const getCamera = useCallback(async () => {
    stopCamera();
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
          videoRef.current?.play().catch(e => console.error("Erro ao dar play no vídeo:", e));
        };
      }
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Câmera inacessível',
        description: 'Por favor, permita o acesso à câmera para tirar fotos das provas.',
      });
      setIsCameraOpen(false);
    }
  }, [facingMode, toast, stopCamera]);

  useEffect(() => {
    if (isCameraOpen) {
      getCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isCameraOpen, getCamera, stopCamera]);

  const saveTemplatesToLocal = (newTemplates: TestTemplate[]) => {
    setTemplates(newTemplates);
    window.localStorage.setItem('provaFacilTemplates', JSON.stringify(newTemplates));
  };
  
  const saveExamsToLocal = (newExams: SavedExam[]) => {
    setSavedExams(newExams);
    window.localStorage.setItem('provaFacilSavedExams', JSON.stringify(newExams));
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
      toast({ title: 'Gabarito atualizado!' });
    } else {
      updatedTemplates = [...templates, newTemplate];
      toast({ title: 'Gabarito criado!' });
    }
    
    saveTemplatesToLocal(updatedTemplates);
    setIsFormOpen(false);
    setSelectedTemplateId(newTemplate.id);
  }
  
  const handleGrade = async () => {
    if (!image || !selectedTemplateId) return;
    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    setIsProcessing(true);
    setResults(null);

    try {
      const result = await gradeExamAction(image, template.answerKey, template.points);
      if (result) {
        setResults(result);
        toast({ title: 'Correção finalizada!', description: `Nota: ${result.grade.score.toFixed(1)}%` });
      } else {
        throw new Error('Falha na resposta da IA');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro na Correção',
        description: 'Não foi possível processar a imagem. Tente uma foto mais nítida.',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const takePicture = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0);
        const dataUri = canvas.toDataURL('image/jpeg', 0.85);
        if(isFormOpen) setTemplateImage(dataUri);
        else {
          setImage(dataUri);
          setResults(null);
        }
      }
      setIsCameraOpen(false);
    }
  };

  const handleSaveExam = () => {
    if (!results || !studentName || !image || !selectedTemplate) return;

    const newSavedExam: SavedExam = {
      id: uuidv4(),
      studentName,
      templateName: selectedTemplate.name,
      grade: results.grade,
      details: results.details,
      image,
      correctionDate: new Date().toISOString(),
    };

    saveExamsToLocal([newSavedExam, ...savedExams]);
    setIsSaveExamDialogOpen(false);
    setStudentName('');
    toast({ title: 'Correção salva!' });
  };

  const handleExtractFromImage = async () => {
    if (!templateImage) return;
    setIsExtracting(true);
    try {
      const extractedAnswers = await extractAnswersFromKeyImageAction(templateImage);
      if (extractedAnswers?.length) {
        const newQuestions = extractedAnswers.map(answer => ({
          ...defaultQuestion,
          answer: ['A', 'B', 'C', 'D', 'E'].includes(answer) ? answer : 'A',
        }));
        replace(newQuestions);
        toast({ title: 'Gabarito extraído com sucesso!' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao extrair gabarito.' });
    } finally {
      setIsExtracting(false);
    }
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Passo 1: Seleção de Gabarito */}
          <Card className="shadow-lg border-primary/20">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary rounded-lg text-primary-foreground">
                  <BookCopy className="w-8 h-8" />
                </div>
                <div>
                  <CardTitle>1. Escolha o Gabarito</CardTitle>
                  <CardDescription>Qual prova vamos corrigir?</CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={openNewForm}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Novo
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm"><Edit className="mr-2 h-4 w-4" /> Gerenciar</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Gabaritos Salvos</DialogTitle></DialogHeader>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {templates.map(t => (
                        <div key={t.id} className="flex justify-between items-center p-2 border rounded-md">
                          <span>{t.name}</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditForm(t.id)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => saveTemplatesToLocal(templates.filter(x => x.id !== t.id))} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {templates.length > 0 ? (
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o gabarito..." /></SelectTrigger>
                  <SelectContent>
                    {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum gabarito criado. Comece criando um novo!</p>
              )}
            </CardContent>
          </Card>

          {/* Passo 2: Captura da Prova */}
          {selectedTemplateId && (
            <Card className="shadow-lg border-primary/20 animation-fade-in-up">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary rounded-lg text-primary-foreground">
                    <FileImage className="w-8 h-8" />
                  </div>
                  <div>
                    <CardTitle>2. Capture a Prova</CardTitle>
                    <CardDescription>Tire uma foto ou envie o arquivo.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div 
                  className="relative flex items-center justify-center w-full min-h-[250px] border-2 border-dashed rounded-xl overflow-hidden hover:bg-muted/30 transition-all cursor-pointer"
                  onClick={() => !isProcessing && document.getElementById('exam-upload')?.click()}
                >
                  <input id="exam-upload" type="file" className="hidden" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setImage(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }
                  }} />
                  {image ? (
                    <div className="relative w-full h-full min-h-[250px]">
                      <Image src={image} alt="Preview" fill className="object-contain p-2" />
                      {isProcessing && (
                        <div className="absolute inset-0 bg-primary/10 backdrop-blur-[1px]">
                          <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_15px_blue] animate-scan" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <UploadCloud className="mx-auto h-10 w-10 mb-2" />
                      <p>Clique para enviar ou arraste aqui</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setIsCameraOpen(true)}><Camera className="mr-2 h-4 w-4" /> Câmera</Button>
                  <Button variant="outline" onClick={() => document.getElementById('exam-upload')?.click()}><UploadCloud className="mr-2 h-4 w-4" /> Arquivo</Button>
                </div>
                <Button 
                  className="w-full h-12 text-lg" 
                  disabled={!image || isProcessing} 
                  onClick={handleGrade}
                >
                  {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ScanLine className="mr-2 h-5 w-5" />}
                  {isProcessing ? 'Analisando...' : 'Corrigir'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Resultados */}
          {results && (
            <Card className="shadow-xl border-accent/30 animation-fade-in-up">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Resultados</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setIsSaveExamDialogOpen(true)}><Save className="mr-2 h-4 w-4" /> Salvar</Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-muted/20 rounded-lg border">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-2xl font-bold">{results.grade.score.toFixed(1)}%</span>
                    <span className="text-muted-foreground">{results.grade.earnedPoints} / {results.grade.totalPoints} pts</span>
                  </div>
                  <Progress value={results.grade.score} className="h-3" />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Q</TableHead>
                      <TableHead>Resposta</TableHead>
                      <TableHead>Certo</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.details.map(d => (
                      <TableRow key={d.question}>
                        <TableCell className="font-bold">{d.question}</TableCell>
                        <TableCell>{d.studentAnswer}</TableCell>
                        <TableCell>{d.correctAnswer}</TableCell>
                        <TableCell className="text-right">
                          {d.isCorrect ? <CheckCircle className="text-green-500 h-5 w-5 inline" /> : <XCircle className="text-destructive h-5 w-5 inline" />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          
          {/* Histórico */}
          {savedExams.length > 0 && (
            <div className="pt-8">
              <h3 className="text-lg font-bold mb-4">Histórico de Correções</h3>
              <Accordion type="single" collapsible className="space-y-2">
                {savedExams.map(exam => (
                  <AccordionItem key={exam.id} value={exam.id} className="bg-card border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex justify-between w-full pr-4">
                        <span>{exam.studentName}</span>
                        <span className="font-bold text-primary">{exam.grade.score.toFixed(0)}%</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 border-t">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative w-full md:w-32 aspect-[3/4] border rounded-md">
                          <Image src={exam.image} alt="Prova" fill className="object-contain" />
                        </div>
                        <div className="flex-grow">
                          <p className="text-sm text-muted-foreground mb-2">Data: {new Date(exam.correctionDate).toLocaleDateString()}</p>
                          <Button variant="ghost" size="sm" onClick={() => saveExamsToLocal(savedExams.filter(x => x.id !== exam.id))} className="text-destructive">Excluir Registro</Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </div>
      </main>

      {/* Dialog: Criar Gabarito */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle>Gabarito da Prova</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-hidden flex flex-col">
              <FormField control={form.control} name="name" render={({field}) => (
                <FormItem><FormLabel>Nome da Avaliação</FormLabel><FormControl><Input {...field} placeholder="Ex: Simulado de História" /></FormControl></FormItem>
              )} />
              
              <div className="p-3 border rounded-md bg-muted/20">
                <p className="text-xs font-bold uppercase mb-2">Extração Automática</p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('key-upload')?.click()}><UploadCloud className="h-4 w-4 mr-2" /> Foto do Gabarito</Button>
                  <input id="key-upload" type="file" className="hidden" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setTemplateImage(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }
                  }} />
                  {templateImage && <Button type="button" size="sm" onClick={handleExtractFromImage} disabled={isExtracting}>{isExtracting ? <Loader2 className="animate-spin h-4 w-4" /> : 'Extrair agora'}</Button>}
                </div>
              </div>

              <ScrollArea className="flex-grow border-t pt-4 px-2">
                <div className="space-y-3 pb-4">
                  {fields.map((f, i) => (
                    <div key={f.id} className="flex items-center gap-4 p-2 border rounded-md relative">
                      <span className="font-bold w-6">{i+1}.</span>
                      <FormField control={form.control} name={`questions.${i}.answer`} render={({field}) => (
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-2">
                          {['A','B','C','D','E'].map(o => (
                            <div key={o} className="flex items-center space-x-1">
                              <RadioGroupItem value={o} id={`${f.id}-${o}`} />
                              <Label htmlFor={`${f.id}-${o}`} className="text-xs">{o}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )} />
                      <FormField control={form.control} name={`questions.${i}.points`} render={({field}) => (
                        <Input type="number" step="0.5" {...field} className="w-16 h-8 text-xs ml-auto" />
                      )} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="h-6 w-6 text-destructive"><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" className="w-full" onClick={() => append(defaultQuestion)}><Plus className="h-4 w-4 mr-2" /> Nova Questão</Button>
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button type="submit">Salvar Gabarito</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Câmera */}
      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Capturar Imagem</DialogTitle></DialogHeader>
          <div className="relative aspect-[3/4] bg-black rounded-lg overflow-hidden border">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            <div className="absolute inset-8 border-2 border-dashed border-white/40 pointer-events-none rounded-lg" />
          </div>
          <DialogFooter className="flex justify-between items-center sm:justify-between">
            <Button variant="ghost" size="icon" onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}><RefreshCw className="h-5 w-5" /></Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setIsCameraOpen(false)}>Cancelar</Button>
              <Button onClick={takePicture} size="lg"><Camera className="mr-2 h-5 w-5" /> Capturar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Salvar */}
      <Dialog open={isSaveExamDialogOpen} onOpenChange={setIsSaveExamDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Salvar Correção</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Label>Nome do Aluno</Label>
            <Input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Ex: João da Silva" />
          </div>
          <DialogFooter>
            <Button onClick={handleSaveExam} disabled={!studentName}>Confirmar e Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
