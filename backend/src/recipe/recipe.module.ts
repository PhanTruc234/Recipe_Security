import { Module } from '@nestjs/common';
import { RecipeService } from './recipe.service';
import { RecipeController } from './recipe.controller';
import { SecurityLogModule } from '../security-log/security-log.module';

@Module({
  imports: [SecurityLogModule],
  controllers: [RecipeController],
  providers: [RecipeService],
})
export class RecipeModule { }