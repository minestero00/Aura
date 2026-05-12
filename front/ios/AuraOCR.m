#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AuraOCR, NSObject)

RCT_EXTERN_METHOD(extractText:(NSString *)imagePath
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end
