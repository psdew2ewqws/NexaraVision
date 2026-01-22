/**
 * NexaraVision Model Registry
 *
 * Contains all available ML models for violence detection with their specifications,
 * accuracy metrics, and configuration options. Only models with >75% accuracy
 * trained on dual datasets are available for user selection.
 *
 * Updated: January 22, 2026 - Actual accuracy values from server model files
 */

export type ModelArchitecture = 'STGCNPP' | 'MSG3D';
export type ModelRole = 'PRIMARY' | 'VETO';
export type DatasetType = 'single' | 'dual' | 'lightft';

export interface ModelSpec {
  id: string;
  name: string;
  displayName: string;
  architecture: ModelArchitecture;
  trainingAccuracy: number;
  datasets: string[];
  datasetType: DatasetType;
  parameters: string;
  dropout: number;
  inputShape: string;
  description: string;
  descriptionAr: string;
  strengths: string[];
  strengthsAr: string[];
  recommendedRole: ModelRole;
  recommendedThreshold: number;
  minThreshold: number;
  maxThreshold: number;
  filePath: string;
  isAvailable: boolean;
  isDualDataset: boolean;
}

export interface ThresholdExplanation {
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  useCases: {
    title: string;
    titleAr: string;
    value: number;
    description: string;
    descriptionAr: string;
  }[];
  impact: 'sensitivity' | 'specificity' | 'both';
}

// All available models with ACTUAL accuracy from server model files
export const MODEL_REGISTRY: ModelSpec[] = [
  // ================ COMBINED MODELS (Dual Dataset) ================
  {
    id: 'STGCNPP_Kaggle_NTU',
    name: 'STGCNPP_Kaggle_NTU',
    displayName: 'ST-GCN++ Kaggle+NTU',
    architecture: 'STGCNPP',
    trainingAccuracy: 94.56,
    datasets: ['Kaggle', 'NTU120'],
    datasetType: 'dual',
    parameters: '6.9 MB',
    dropout: 0.0,
    inputShape: '(N, M=2, T=32, V=17, C=3)',
    description: 'Best PRIMARY model. Trained on real violence (Kaggle) and normal actions (NTU120). Best separation: 97.4% on violence vs 7.6% on non-violence. Recommended for production.',
    descriptionAr: 'أفضل نموذج أساسي. مدرب على العنف الحقيقي (Kaggle) والأفعال العادية (NTU120). أفضل فصل بين العنف وعدم العنف.',
    strengths: ['Best violence/non-violence separation', 'Production tested (0.1% FP)', 'Most stable predictions', 'Adaptive graph learning'],
    strengthsAr: ['أفضل فصل بين العنف/عدم العنف', 'اختبار إنتاج (0.1% إيجابي كاذب)', 'أكثر التوقعات استقراراً', 'تعلم الرسم البياني التكيفي'],
    recommendedRole: 'PRIMARY',
    recommendedThreshold: 94,
    minThreshold: 50,
    maxThreshold: 99,
    filePath: '/app/nexaravision/models/combined/STGCNPP_Kaggle_NTU.pth',
    isAvailable: true,
    isDualDataset: true,
  },
  {
    id: 'MSG3D_Kaggle_NTU',
    name: 'MSG3D_Kaggle_NTU',
    displayName: 'MS-G3D Kaggle+NTU',
    architecture: 'MSG3D',
    trainingAccuracy: 95.17,
    datasets: ['Kaggle', 'NTU120'],
    datasetType: 'dual',
    parameters: '4.2 MB',
    dropout: 0.3,
    inputShape: '(N, M=2, T=32, V=17, C=3)',
    description: 'Best VETO model. Multi-scale temporal analysis (3,5,7 frames). 99.9% confidence on true violence. Different architecture provides diversity for dual-model confirmation.',
    descriptionAr: 'أفضل نموذج فيتو. تحليل زمني متعدد المقاييس. 99.9% ثقة على العنف الحقيقي.',
    strengths: ['Highest training accuracy (95.17%)', 'Multi-scale motion detection', '99.9% on true violence', 'Excellent VETO confirmation'],
    strengthsAr: ['أعلى دقة تدريب (95.17%)', 'كشف حركة متعدد المقاييس', '99.9% على العنف الحقيقي', 'تأكيد فيتو ممتاز'],
    recommendedRole: 'VETO',
    recommendedThreshold: 85,
    minThreshold: 50,
    maxThreshold: 99,
    filePath: '/app/nexaravision/models/combined/MSG3D_Kaggle_NTU.pth',
    isAvailable: true,
    isDualDataset: true,
  },
  {
    id: 'MSG3D_RWF_NTU',
    name: 'MSG3D_RWF_NTU',
    displayName: 'MS-G3D RWF+NTU',
    architecture: 'MSG3D',
    trainingAccuracy: 92.50,
    datasets: ['RWF2000', 'NTU120'],
    datasetType: 'dual',
    parameters: '4.2 MB',
    dropout: 0.3,
    inputShape: '(N, M=2, T=32, V=17, C=3)',
    description: 'Trained on Real World Fighting dataset + NTU120. Excellent for phone/surveillance footage with real fighting scenarios.',
    descriptionAr: 'مدرب على مجموعة بيانات القتال في العالم الحقيقي + NTU120. ممتاز للهاتف/المراقبة.',
    strengths: ['Real-world fighting patterns', '92.5% accuracy', 'Good for mobile footage', 'Strong on street fights'],
    strengthsAr: ['أنماط القتال الواقعية', 'دقة 92.5%', 'جيد للقطات المحمول', 'قوي في قتال الشوارع'],
    recommendedRole: 'VETO',
    recommendedThreshold: 88,
    minThreshold: 50,
    maxThreshold: 99,
    filePath: '/app/nexaravision/models/combined/MSG3D_RWF_NTU.pth',
    isAvailable: true,
    isDualDataset: true,
  },
  {
    id: 'STGCNPP_RWF_NTU',
    name: 'STGCNPP_RWF_NTU',
    displayName: 'ST-GCN++ RWF+NTU',
    architecture: 'STGCNPP',
    trainingAccuracy: 92.37,
    datasets: ['RWF2000', 'NTU120'],
    datasetType: 'dual',
    parameters: '6.9 MB',
    dropout: 0.0,
    inputShape: '(N, M=2, T=32, V=17, C=3)',
    description: 'ST-GCN++ variant trained on RWF2000 real fighting data. More stable than MSG3D with good real-world performance.',
    descriptionAr: 'متغير ST-GCN++ مدرب على بيانات القتال الحقيقي RWF2000. أكثر استقراراً من MSG3D.',
    strengths: ['Stable ST-GCN++ architecture', '92.37% accuracy', 'Real fighting scenarios', 'Good PRIMARY alternative'],
    strengthsAr: ['بنية ST-GCN++ المستقرة', 'دقة 92.37%', 'سيناريوهات قتال حقيقية', 'بديل أساسي جيد'],
    recommendedRole: 'PRIMARY',
    recommendedThreshold: 90,
    minThreshold: 50,
    maxThreshold: 99,
    filePath: '/app/nexaravision/models/combined/STGCNPP_RWF_NTU.pth',
    isAvailable: true,
    isDualDataset: true,
  },
  {
    id: 'STGCNPP_SCVD_NTU',
    name: 'STGCNPP_SCVD_NTU',
    displayName: 'ST-GCN++ SCVD+NTU',
    architecture: 'STGCNPP',
    trainingAccuracy: 89.77,
    datasets: ['SCVD', 'NTU120'],
    datasetType: 'dual',
    parameters: '6.9 MB',
    dropout: 0.0,
    inputShape: '(N, M=2, T=32, V=17, C=3)',
    description: 'Optimized for surveillance camera footage (SCVD). Best for CCTV environments with typical surveillance video quality.',
    descriptionAr: 'محسن لقطات كاميرات المراقبة (SCVD). الأفضل لبيئات CCTV.',
    strengths: ['CCTV optimized', '89.77% accuracy', 'Low-quality video tolerant', 'Surveillance environments'],
    strengthsAr: ['محسن لـ CCTV', 'دقة 89.77%', 'متحمل للفيديو منخفض الجودة', 'بيئات المراقبة'],
    recommendedRole: 'VETO',
    recommendedThreshold: 86,
    minThreshold: 50,
    maxThreshold: 99,
    filePath: '/app/nexaravision/models/combined/STGCNPP_SCVD_NTU.pth',
    isAvailable: true,
    isDualDataset: true,
  },
  {
    id: 'MSG3D_SCVD_NTU',
    name: 'MSG3D_SCVD_NTU',
    displayName: 'MS-G3D SCVD+NTU',
    architecture: 'MSG3D',
    trainingAccuracy: 88.21,
    datasets: ['SCVD', 'NTU120'],
    datasetType: 'dual',
    parameters: '4.2 MB',
    dropout: 0.3,
    inputShape: '(N, M=2, T=32, V=17, C=3)',
    description: 'MS-G3D variant for surveillance. Multi-scale analysis on CCTV-style footage.',
    descriptionAr: 'متغير MS-G3D للمراقبة. تحليل متعدد المقاييس على قطات CCTV.',
    strengths: ['Surveillance optimized', '88.21% accuracy', 'Multi-scale CCTV analysis', 'Different from STGCNPP'],
    strengthsAr: ['محسن للمراقبة', 'دقة 88.21%', 'تحليل CCTV متعدد المقاييس', 'مختلف عن STGCNPP'],
    recommendedRole: 'VETO',
    recommendedThreshold: 85,
    minThreshold: 50,
    maxThreshold: 99,
    filePath: '/app/nexaravision/models/combined/MSG3D_SCVD_NTU.pth',
    isAvailable: true,
    isDualDataset: true,
  },
  {
    id: 'MSG3D_RWF_Kaggle',
    name: 'MSG3D_RWF_Kaggle',
    displayName: 'MS-G3D RWF+Kaggle',
    architecture: 'MSG3D',
    trainingAccuracy: 85.51,
    datasets: ['RWF2000', 'Kaggle'],
    datasetType: 'dual',
    parameters: '4.2 MB',
    dropout: 0.3,
    inputShape: '(N, M=2, T=32, V=17, C=3)',
    description: 'Dual violence dataset (RWF + Kaggle). Both datasets contain real fighting - good for diverse violence scenarios.',
    descriptionAr: 'مجموعة بيانات عنف مزدوجة (RWF + Kaggle). كلا المجموعتين تحتويان على قتال حقيقي.',
    strengths: ['Dual violence training', '85.51% accuracy', 'Diverse violence types', 'Real-world variety'],
    strengthsAr: ['تدريب عنف مزدوج', 'دقة 85.51%', 'أنواع عنف متنوعة', 'تنوع العالم الحقيقي'],
    recommendedRole: 'VETO',
    recommendedThreshold: 82,
    minThreshold: 50,
    maxThreshold: 99,
    filePath: '/app/nexaravision/models/combined/MSG3D_RWF_Kaggle.pth',
    isAvailable: true,
    isDualDataset: true,
  },
  {
    id: 'STGCNPP_RWF_Kaggle',
    name: 'STGCNPP_RWF_Kaggle',
    displayName: 'ST-GCN++ RWF+Kaggle',
    architecture: 'STGCNPP',
    trainingAccuracy: 84.55,
    datasets: ['RWF2000', 'Kaggle'],
    datasetType: 'dual',
    parameters: '6.9 MB',
    dropout: 0.0,
    inputShape: '(N, M=2, T=32, V=17, C=3)',
    description: 'ST-GCN++ with dual violence datasets. More stable than MSG3D for diverse fighting scenarios.',
    descriptionAr: 'ST-GCN++ مع مجموعات بيانات عنف مزدوجة. أكثر استقراراً من MSG3D.',
    strengths: ['Stable architecture', '84.55% accuracy', 'Dual violence training', 'Good balance'],
    strengthsAr: ['بنية مستقرة', 'دقة 84.55%', 'تدريب عنف مزدوج', 'توازن جيد'],
    recommendedRole: 'VETO',
    recommendedThreshold: 82,
    minThreshold: 50,
    maxThreshold: 99,
    filePath: '/app/nexaravision/models/combined/STGCNPP_RWF_Kaggle.pth',
    isAvailable: true,
    isDualDataset: true,
  },
  {
    id: 'MSG3D_SCVD_Kaggle',
    name: 'MSG3D_SCVD_Kaggle',
    displayName: 'MS-G3D SCVD+Kaggle',
    architecture: 'MSG3D',
    trainingAccuracy: 82.05,
    datasets: ['SCVD', 'Kaggle'],
    datasetType: 'dual',
    parameters: '4.2 MB',
    dropout: 0.3,
    inputShape: '(N, M=2, T=32, V=17, C=3)',
    description: 'Combines CCTV surveillance patterns with real violence. Good for security camera deployments.',
    descriptionAr: 'يجمع أنماط مراقبة CCTV مع العنف الحقيقي. جيد لنشر كاميرات الأمان.',
    strengths: ['CCTV + real violence', '82.05% accuracy', 'Security deployments', 'Multi-scale analysis'],
    strengthsAr: ['CCTV + عنف حقيقي', 'دقة 82.05%', 'نشر الأمان', 'تحليل متعدد المقاييس'],
    recommendedRole: 'VETO',
    recommendedThreshold: 80,
    minThreshold: 50,
    maxThreshold: 99,
    filePath: '/app/nexaravision/models/combined/MSG3D_SCVD_Kaggle.pth',
    isAvailable: true,
    isDualDataset: true,
  },
  {
    id: 'STGCNPP_SCVD_Kaggle',
    name: 'STGCNPP_SCVD_Kaggle',
    displayName: 'ST-GCN++ SCVD+Kaggle',
    architecture: 'STGCNPP',
    trainingAccuracy: 80.05,
    datasets: ['SCVD', 'Kaggle'],
    datasetType: 'dual',
    parameters: '6.9 MB',
    dropout: 0.0,
    inputShape: '(N, M=2, T=32, V=17, C=3)',
    description: 'ST-GCN++ for CCTV environments with real violence training. Stable architecture for security.',
    descriptionAr: 'ST-GCN++ لبيئات CCTV مع تدريب عنف حقيقي. بنية مستقرة للأمان.',
    strengths: ['CCTV optimized', '80.05% accuracy', 'Stable predictions', 'Security focused'],
    strengthsAr: ['محسن لـ CCTV', 'دقة 80.05%', 'توقعات مستقرة', 'تركيز على الأمان'],
    recommendedRole: 'VETO',
    recommendedThreshold: 78,
    minThreshold: 50,
    maxThreshold: 99,
    filePath: '/app/nexaravision/models/combined/STGCNPP_SCVD_Kaggle.pth',
    isAvailable: true,
    isDualDataset: true,
  },

  // ================ LIGHT FINE-TUNED MODELS ================
  {
    id: 'STGCNPP_SCVD_NTU_lightft',
    name: 'STGCNPP_SCVD_NTU_lightft',
    displayName: 'ST-GCN++ SCVD+NTU (Fine-tuned)',
    architecture: 'STGCNPP',
    trainingAccuracy: 98.64,
    datasets: ['SCVD', 'NTU120'],
    datasetType: 'lightft',
    parameters: '6.9 MB',
    dropout: 0.0,
    inputShape: '(N, M=2, T=32, V=17, C=3)',
    description: 'HIGHEST ACCURACY (98.64%). Fine-tuned for surveillance. Excellent for CCTV-heavy deployments requiring maximum accuracy.',
    descriptionAr: 'أعلى دقة (98.64%). مضبوط للمراقبة. ممتاز للنشر الكثيف لـ CCTV.',
    strengths: ['Highest accuracy (98.64%)', 'CCTV specialized', 'Fine-tuned precision', 'Maximum confidence'],
    strengthsAr: ['أعلى دقة (98.64%)', 'متخصص في CCTV', 'دقة مضبوطة', 'أقصى ثقة'],
    recommendedRole: 'VETO',
    recommendedThreshold: 90,
    minThreshold: 50,
    maxThreshold: 99,
    filePath: '/app/nexaravision/models/light_finetuned/STGCNPP_SCVD_NTU_lightft.pth',
    isAvailable: true,
    isDualDataset: true,
  },
  {
    id: 'STGCNPP_Kaggle_NTU_lightft',
    name: 'STGCNPP_Kaggle_NTU_lightft',
    displayName: 'ST-GCN++ Kaggle+NTU (Fine-tuned)',
    architecture: 'STGCNPP',
    trainingAccuracy: 98.03,
    datasets: ['Kaggle', 'NTU120'],
    datasetType: 'lightft',
    parameters: '6.9 MB',
    dropout: 0.0,
    inputShape: '(N, M=2, T=32, V=17, C=3)',
    description: 'Fine-tuned version of the best production model. 98.03% accuracy. Excellent VETO confirmation with same training data as PRIMARY.',
    descriptionAr: 'نسخة مضبوطة من أفضل نموذج إنتاج. دقة 98.03%. تأكيد فيتو ممتاز.',
    strengths: ['98.03% accuracy', 'Same data as PRIMARY', 'Fine-tuned precision', 'Strong VETO model'],
    strengthsAr: ['دقة 98.03%', 'نفس البيانات الأساسية', 'دقة مضبوطة', 'نموذج فيتو قوي'],
    recommendedRole: 'VETO',
    recommendedThreshold: 92,
    minThreshold: 50,
    maxThreshold: 99,
    filePath: '/app/nexaravision/models/light_finetuned/STGCNPP_Kaggle_NTU_lightft.pth',
    isAvailable: true,
    isDualDataset: true,
  },
  {
    id: 'STGCNPP_SCVD_Kaggle_lightft',
    name: 'STGCNPP_SCVD_Kaggle_lightft',
    displayName: 'ST-GCN++ SCVD+Kaggle (Fine-tuned)',
    architecture: 'STGCNPP',
    trainingAccuracy: 78.16,
    datasets: ['SCVD', 'Kaggle'],
    datasetType: 'lightft',
    parameters: '6.9 MB',
    dropout: 0.0,
    inputShape: '(N, M=2, T=32, V=17, C=3)',
    description: 'Fine-tuned for dual-violence scenarios. Good for varied CCTV + real-world violence detection.',
    descriptionAr: 'مضبوط لسيناريوهات عنف مزدوجة. جيد لـ CCTV متنوع + كشف عنف العالم الحقيقي.',
    strengths: ['Dual violence fine-tuned', '78.16% accuracy', 'CCTV + real violence', 'Varied scenarios'],
    strengthsAr: ['مضبوط لعنف مزدوج', 'دقة 78.16%', 'CCTV + عنف حقيقي', 'سيناريوهات متنوعة'],
    recommendedRole: 'VETO',
    recommendedThreshold: 76,
    minThreshold: 50,
    maxThreshold: 99,
    filePath: '/app/nexaravision/models/light_finetuned/STGCNPP_SCVD_Kaggle_lightft.pth',
    isAvailable: true,
    isDualDataset: true,
  },
];

// Get only models with >75% accuracy and dual-dataset training
export function getAvailableModels(): ModelSpec[] {
  return MODEL_REGISTRY.filter(
    (model) => model.isAvailable && model.isDualDataset && model.trainingAccuracy >= 75
  );
}

// Get models suitable for PRIMARY role (typically STGCNPP with high accuracy)
export function getPrimaryModels(): ModelSpec[] {
  return getAvailableModels().filter(
    (model) => model.architecture === 'STGCNPP' && model.trainingAccuracy >= 80
  ).sort((a, b) => b.trainingAccuracy - a.trainingAccuracy);
}

// Get models suitable for VETO role
export function getVetoModels(): ModelSpec[] {
  return getAvailableModels().sort((a, b) => b.trainingAccuracy - a.trainingAccuracy);
}

// Get model by ID
export function getModelById(id: string): ModelSpec | undefined {
  return MODEL_REGISTRY.find((model) => model.id === id);
}

// Threshold explanations with use cases
export const THRESHOLD_EXPLANATIONS: Record<string, ThresholdExplanation> = {
  primary_threshold: {
    name: 'Primary Model Threshold',
    nameAr: 'حد النموذج الأساسي',
    description: 'The minimum confidence score required from the PRIMARY model to flag potential violence. Higher values reduce false positives but may miss subtle violence.',
    descriptionAr: 'الحد الأدنى لدرجة الثقة المطلوبة من النموذج الأساسي للإبلاغ عن العنف المحتمل.',
    useCases: [
      {
        title: 'High Security',
        titleAr: 'أمان عالي',
        value: 85,
        description: 'Banks, government - catches more threats, some false alarms expected',
        descriptionAr: 'البنوك والحكومة - يلتقط المزيد من التهديدات، بعض الإنذارات الكاذبة متوقعة',
      },
      {
        title: 'Balanced (Recommended)',
        titleAr: 'متوازن (موصى به)',
        value: 94,
        description: 'Schools, offices - 0.1% false positive rate, tested on 853+ frames',
        descriptionAr: 'المدارس والمكاتب - معدل إيجابي خاطئ 0.1%، اختبر على 853+ إطار',
      },
      {
        title: 'Minimal False Positives',
        titleAr: 'إيجابيات خاطئة قليلة',
        value: 97,
        description: 'Busy public spaces - only very clear violence triggers alerts',
        descriptionAr: 'الأماكن العامة المزدحمة - فقط العنف الواضح جداً يشغل التنبيهات',
      },
    ],
    impact: 'specificity',
  },
  veto_threshold: {
    name: 'VETO Model Threshold',
    nameAr: 'حد نموذج الفيتو',
    description: 'The second model must also exceed this threshold to confirm violence. VETO acts as a second opinion - both models must agree for an alert to trigger.',
    descriptionAr: 'يجب أن يتجاوز النموذج الثاني أيضاً هذا الحد لتأكيد العنف. الفيتو يعمل كرأي ثانٍ.',
    useCases: [
      {
        title: 'More Alerts',
        titleAr: 'المزيد من التنبيهات',
        value: 70,
        description: 'Fewer vetoes, more alerts - for high-risk environments',
        descriptionAr: 'فيتو أقل، تنبيهات أكثر - للبيئات عالية الخطورة',
      },
      {
        title: 'Balanced (Recommended)',
        titleAr: 'متوازن (موصى به)',
        value: 85,
        description: 'Dual-model confirmation filters 98.8% of non-violence correctly',
        descriptionAr: 'تأكيد ثنائي النموذج يصفي 98.8% من عدم العنف بشكل صحيح',
      },
      {
        title: 'Very Conservative',
        titleAr: 'محافظ جداً',
        value: 92,
        description: 'Only the most certain violence - both models must be very confident',
        descriptionAr: 'فقط العنف الأكثر يقيناً - يجب أن يكون كلا النموذجين واثقين جداً',
      },
    ],
    impact: 'both',
  },
  instant_trigger_threshold: {
    name: 'Instant Alert Threshold',
    nameAr: 'حد التنبيه الفوري',
    description: 'When confidence exceeds this for consecutive frames, trigger immediate alert without waiting.',
    descriptionAr: 'عندما تتجاوز الثقة هذا لإطارات متتالية، يتم تشغيل تنبيه فوري.',
    useCases: [
      {
        title: 'Quick Response',
        titleAr: 'استجابة سريعة',
        value: 90,
        description: 'Faster alerts for immediate threats',
        descriptionAr: 'تنبيهات أسرع للتهديدات الفورية',
      },
      {
        title: 'Standard',
        titleAr: 'قياسي',
        value: 95,
        description: 'Clear, high-confidence violence only',
        descriptionAr: 'العنف الواضح عالي الثقة فقط',
      },
      {
        title: 'Very Certain',
        titleAr: 'متأكد جداً',
        value: 98,
        description: 'Only obvious violence triggers instant alerts',
        descriptionAr: 'فقط العنف الواضح يشغل التنبيهات الفورية',
      },
    ],
    impact: 'sensitivity',
  },
  sustained_threshold: {
    name: 'Sustained Detection Threshold',
    nameAr: 'حد الكشف المستمر',
    description: 'Confidence that must be maintained over time for sustained violence alert.',
    descriptionAr: 'الثقة التي يجب الحفاظ عليها لتنبيه العنف المستمر.',
    useCases: [
      {
        title: 'Sensitive',
        titleAr: 'حساس',
        value: 60,
        description: 'Catches developing situations early',
        descriptionAr: 'يلتقط المواقف المتطورة مبكراً',
      },
      {
        title: 'Standard',
        titleAr: 'قياسي',
        value: 70,
        description: 'Good balance for most environments',
        descriptionAr: 'توازن جيد لمعظم البيئات',
      },
      {
        title: 'Conservative',
        titleAr: 'محافظ',
        value: 85,
        description: 'Only clear, sustained violence triggers',
        descriptionAr: 'فقط العنف الواضح والمستمر',
      },
    ],
    impact: 'sensitivity',
  },
};

// Model combination presets
export interface ModelPreset {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  primaryModel: string;
  primaryThreshold: number;
  vetoModel: string;
  vetoThreshold: number;
  useCase: string;
  useCaseAr: string;
}

export const MODEL_PRESETS: ModelPreset[] = [
  {
    id: 'production',
    name: 'Production (Recommended)',
    nameAr: 'الإنتاج (موصى به)',
    description: 'Tested configuration with 0.1% false positive rate on 853+ frames',
    descriptionAr: 'تكوين مختبر مع معدل إيجابي كاذب 0.1% على 853+ إطار',
    primaryModel: 'STGCNPP_Kaggle_NTU',
    primaryThreshold: 94,
    vetoModel: 'MSG3D_Kaggle_NTU',
    vetoThreshold: 85,
    useCase: 'General purpose - offices, schools, retail',
    useCaseAr: 'الاستخدام العام - المكاتب والمدارس والتجزئة',
  },
  {
    id: 'high_security',
    name: 'High Security',
    nameAr: 'أمان عالي',
    description: 'Lower thresholds catch more potential threats (more alerts)',
    descriptionAr: 'حدود أقل لالتقاط المزيد من التهديدات (تنبيهات أكثر)',
    primaryModel: 'STGCNPP_Kaggle_NTU',
    primaryThreshold: 88,
    vetoModel: 'MSG3D_Kaggle_NTU',
    vetoThreshold: 75,
    useCase: 'Banks, government, critical infrastructure',
    useCaseAr: 'البنوك والحكومة والبنية التحتية الحيوية',
  },
  {
    id: 'surveillance_cctv',
    name: 'Surveillance CCTV',
    nameAr: 'مراقبة CCTV',
    description: 'Optimized for CCTV camera footage with highest accuracy models',
    descriptionAr: 'محسن لقطات كاميرات CCTV مع نماذج الدقة الأعلى',
    primaryModel: 'STGCNPP_Kaggle_NTU',
    primaryThreshold: 92,
    vetoModel: 'STGCNPP_SCVD_NTU_lightft',
    vetoThreshold: 88,
    useCase: 'Parking lots, warehouses, building exteriors',
    useCaseAr: 'مواقف السيارات والمستودعات وخارج المباني',
  },
  {
    id: 'low_false_positive',
    name: 'Low False Positive',
    nameAr: 'إيجابيات خاطئة منخفضة',
    description: 'Higher thresholds minimize false alarms in busy areas',
    descriptionAr: 'حدود أعلى لتقليل الإنذارات الكاذبة في المناطق المزدحمة',
    primaryModel: 'STGCNPP_Kaggle_NTU',
    primaryThreshold: 96,
    vetoModel: 'MSG3D_Kaggle_NTU',
    vetoThreshold: 90,
    useCase: 'Public spaces, malls, transit stations',
    useCaseAr: 'الأماكن العامة والمراكز التجارية ومحطات النقل',
  },
  {
    id: 'max_accuracy',
    name: 'Maximum Accuracy',
    nameAr: 'أقصى دقة',
    description: 'Uses highest accuracy fine-tuned models (98%+)',
    descriptionAr: 'يستخدم نماذج مضبوطة بأعلى دقة (98%+)',
    primaryModel: 'STGCNPP_Kaggle_NTU',
    primaryThreshold: 94,
    vetoModel: 'STGCNPP_SCVD_NTU_lightft',
    vetoThreshold: 92,
    useCase: 'High-stakes environments requiring maximum confidence',
    useCaseAr: 'البيئات عالية المخاطر التي تتطلب أقصى ثقة',
  },
  {
    id: 'real_world_fighting',
    name: 'Real World Fighting',
    nameAr: 'قتال العالم الحقيقي',
    description: 'Models trained on RWF2000 real fighting dataset',
    descriptionAr: 'نماذج مدربة على مجموعة بيانات القتال الحقيقي RWF2000',
    primaryModel: 'STGCNPP_RWF_NTU',
    primaryThreshold: 90,
    vetoModel: 'MSG3D_RWF_NTU',
    vetoThreshold: 85,
    useCase: 'Street environments, mobile footage, real fights',
    useCaseAr: 'بيئات الشوارع، لقطات المحمول، القتال الحقيقي',
  },
  {
    id: 'dual_architecture',
    name: 'Dual Architecture',
    nameAr: 'بنية مزدوجة',
    description: 'Uses both ST-GCN++ and MS-G3D for maximum diversity',
    descriptionAr: 'يستخدم كلاً من ST-GCN++ و MS-G3D للتنوع الأقصى',
    primaryModel: 'STGCNPP_Kaggle_NTU',
    primaryThreshold: 94,
    vetoModel: 'MSG3D_Kaggle_NTU',
    vetoThreshold: 85,
    useCase: 'Environments requiring two different analysis approaches',
    useCaseAr: 'البيئات التي تتطلب نهجين تحليليين مختلفين',
  },
];

// Default model configuration
export const DEFAULT_MODEL_CONFIG = {
  primaryModel: 'STGCNPP_Kaggle_NTU',
  primaryThreshold: 94,
  vetoModel: 'MSG3D_Kaggle_NTU',
  vetoThreshold: 85,
  presetId: 'production',
};

// Server connection info
export const ML_SERVER_CONFIG = {
  ip: '79.160.189.79',
  wsPort: 14082,
  httpPort: 14082,
  sshPort: 14039,
  poseModelPort: 14027, // YOLOv8s-pose on port 8384 internally
  instanceId: '30303751',
};
