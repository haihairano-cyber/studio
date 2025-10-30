'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { gradeExamAction } from '@/app/actions';
import type { TestTemplate, GradingResult, DetailedResult } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UploadCloud, PlusCircle, Loader2, CheckCircle, XCircle, AlertCircle, BookCopy, FileImage, ClipboardCheck } from 'lucide-react';
import Image from 'next/image';

const templateFormSchema = z.object({
  name: z.string().min(1, 'O nome do gabarito é obrigatório.'),
  answerKey: z.string().min(1, 'A chave de respostas é obrigatória. Use vírgulas para separar as respostas (ex: A,B,C).'),
  points: z.string().min(1, 'Os pontos para cada questão são obrigatórios. Use vírgulas para separar (ex: 1,1,2).'),
});

export default function Home() {
  const [templates, setTemplates] = useState<TestTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ grade: GradingResult; details: DetailedResult[] } | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedTemplates = window.localStorage.getItem('provaFacilTemplates');
      if (storedTemplates) {
        setTemplates(JSON.parse(storedTemplates));
      }
    } catch (error) {
      console.error("Failed to load templates from localStorage", error);
    }
  }, []);

  const saveTemplates = (newTemplates: TestTemplate[]) => {
    setTemplates(newTemplates);
    try {
      window.localStorage.setItem('provaFacilTemplates', JSON.stringify(newTemplates));
    } catch (error) {
       console.error("Failed to save templates to localStorage", error);
    }
  };

  const form = useForm<z.infer<typeof templateFormSchema>>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: { name: '', answerKey: '', points: '' },
  });

  function onSubmit(values: z.infer<typeof templateFormSchema>) {
    const answerKey = values.answerKey.split(',').map(item => item.trim().toUpperCase());
    const points = values.points.split(',').map(item => parseFloat(item.trim()));

    if (answerKey.length !== points.length) {
      form.setError('points', {
        type: 'manual',
        message: 'O número de pontos deve ser igual ao número de questões.',
      });
      return;
    }

    const newTemplate: TestTemplate = {
      id: uuidv4(),
      name: values.name,
      answerKey: answerKey,
      points: points,
    };
    const updatedTemplates = [...templates, newTemplate];
    saveTemplates(updatedTemplates);
    toast({
      title: 'Sucesso!',
      description: 'Gabarito criado com sucesso.',
    });
    form.reset();
    setIsFormOpen(false);
    setSelectedTemplateId(newTemplate.id);
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
  
  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setResults(null);
  }

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
        throw new Error('A resposta da IA foi inválida.');
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro na Correção',
        description: 'Não foi possível processar a imagem. Tente novamente com uma imagem mais nítida.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card className="shadow-lg animation-fade-in-up">
            <CardHeader>
              <div className="flex items-center gap-3">
                <BookCopy className="w-8 h-8 text-primary" />
                <div>
                  <CardTitle className="text-2xl font-headline">Passo 1: Gabarito</CardTitle>
                  <CardDescription>Selecione um gabarito existente ou crie um novo para sua prova.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4 items-center">
              <Select onValueChange={setSelectedTemplateId} value={selectedTemplateId}>
                <SelectTrigger className="flex-grow">
                  <SelectValue placeholder="Selecione um gabarito..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Criar Novo Gabarito
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Gabarito</DialogTitle>
                    <DialogDescription>
                      Preencha as informações para criar um novo modelo de prova.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Gabarito</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Prova de Biologia 1º Trimestre" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="answerKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Respostas Corretas</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Ex: A, B, C, D, A" {...field} />
                            </FormControl>
                             <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="points"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pontos por Questão</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: 1, 1, 2, 1, 1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                        <Button type="submit">Salvar Gabarito</Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {selectedTemplate && (
            <Card className="shadow-lg animation-fade-in-up" style={{animationDelay: '0.1s'}}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <FileImage className="w-8 h-8 text-primary" />
                  <div>
                    <CardTitle className="text-2xl font-headline">Passo 2: Cartão de Respostas</CardTitle>
                    <CardDescription>Envie uma foto do cartão de respostas do aluno para correção.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div 
                  className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors"
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
                      <p className="mt-2 font-semibold">Clique para enviar ou arraste e solte</p>
                      <p className="text-xs">PNG, JPG, ou WEBP</p>
                    </div>
                  )}
                </div>
                <Button onClick={handleGrade} disabled={!image || isProcessing} className="w-full">
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isProcessing ? 'Corrigindo...' : 'Corrigir Prova'}
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
            <Card className="shadow-lg animation-fade-in-up" style={{animationDelay: '0.2s'}}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="w-8 h-8 text-primary" />
                  <div>
                    <CardTitle className="text-2xl font-headline">Passo 3: Resultados</CardTitle>
                    <CardDescription>Confira o desempenho do aluno.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Resumo da Pontuação</h3>
                  <div className="p-4 bg-muted rounded-lg space-y-4">
                     <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">Pontuação Final ({results.grade.earnedPoints} / {results.grade.totalPoints} pts)</span>
                        <span className="font-bold text-primary">{results.grade.score.toFixed(1)}%</span>
                      </div>
                      <Progress value={results.grade.score} className="h-2" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-background rounded-md">
                            <p className="text-sm text-muted-foreground">Total de Questões</p>
                            <p className="text-2xl font-bold">{results.grade.totalQuestions}</p>
                        </div>
                        <div className="p-3 bg-background rounded-md">
                            <p className="text-sm text-muted-foreground">Corretas</p>
                            <p className="text-2xl font-bold text-green-600">{results.grade.correctAnswers}</p>
                        </div>
                        <div className="p-3 bg-background rounded-md">
                            <p className="text-sm text-muted-foreground">Incorretas</p>
                            <p className="text-2xl font-bold text-destructive">{results.grade.incorrectAnswers}</p>
                        </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                   <h3 className="font-semibold text-lg">Respostas Detalhadas</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Questão</TableHead>
                          <TableHead>Sua Resposta</TableHead>
                          <TableHead>Gabarito</TableHead>
                          <TableHead>Pontos</TableHead>
                          <TableHead className="text-right">Resultado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.details.map((item) => (
                          <TableRow key={item.question} className={!item.isCorrect ? 'bg-destructive/10' : ''}>
                            <TableCell className="font-medium">{item.question}</TableCell>
                            <TableCell>{item.studentAnswer || '-'}</TableCell>
                            <TableCell>{item.correctAnswer}</TableCell>
                            <TableCell>{item.points}</TableCell>
                            <TableCell className="text-right">
                              {item.isCorrect ? 
                                <CheckCircle className="h-5 w-5 text-green-600 inline-block" /> : 
                                <XCircle className="h-5 w-5 text-destructive inline-block" />}
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

          {!selectedTemplateId && templates.length > 0 && (
             <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Próximo passo</AlertTitle>
              <AlertDescription>
                Selecione um gabarito da lista para começar a corrigir.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </main>
    </div>
  );
}
