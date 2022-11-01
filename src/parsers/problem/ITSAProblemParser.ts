import { Sendable } from '../../models/Sendable';
import { TaskBuilder } from '../../models/TaskBuilder';
import { htmlToElement } from '../../utils/dom';
import { Parser } from '../Parser';

export class ITSAProblemParser extends Parser {
  public getMatchPatterns(): string[] {
    return ['https://e-tutor.itsa.org.tw/e-Tutor/mod/programming/*'];
  }

  public async parse(url: string, html: string): Promise<Sendable> {
    const elem = htmlToElement(html);
    const task = new TaskBuilder('ITSA').setUrl(url);

    const content = elem.querySelector('#page > table:nth-child(6) > tbody > tr > td > div.maincontent.generalbox');

    task.setName(content.querySelector('h1').textContent);

    const timeLimitStr = elem.querySelector(
      '#testcase-table > table > tbody > tr:nth-child(2) > td:nth-child(4)',
    ).textContent;
    if (timeLimitStr !== undefined) {
      if (timeLimitStr.includes('無限制')) task.setTimeLimit(10000); // infinite ~> 10s
      else task.setTimeLimit(parseInt(/(\d+)秒/.exec(html)[0], 10) * 1000); // ITSA displays 秒
    } else task.setTimeLimit(10000); // infinite ~ 10s

    const memoryLimitStr = elem.querySelector(
      '#testcase-table > table > tbody > tr:nth-child(2) > td:nth-child(5)',
    ).textContent;
    if (memoryLimitStr !== undefined) {
      if (memoryLimitStr.includes('無限制')) task.setMemoryLimit(1024); // infinite ~> 1GB
      else task.setMemoryLimit(parseInt(/(\d+)M/.exec(html)[0], 10));
    } else task.setMemoryLimit(1024); // infinite ~> 1GB

    const ioCells = [...elem.querySelectorAll('.programming-io a')].map(el =>
      /"[^"]*"/i.exec(el.outerHTML)[0].replace(/amp;/g, '').replace(/"/g, ''),
    );

    for (let i = 0; i < ioCells.length; i += 2) {
      const inputHtml = await this.fetch('https://e-tutor.itsa.org.tw/e-Tutor/mod/programming/' + ioCells[i]);
      const inputElem = htmlToElement(inputHtml);
      const input = inputElem.querySelector('body').textContent;
      const outputHtml = await this.fetch('https://e-tutor.itsa.org.tw/e-Tutor/mod/programming/' + ioCells[i + 1]);
      const outputElem = htmlToElement(outputHtml);
      const output = outputElem.querySelector('body').textContent;

      task.addTest(input, output);
    }

    return task.build();
  }
}
