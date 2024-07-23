import jsdom from 'jsdom'
//const jsdom= require('jsdom')

const { format, select } = await import( 'd3')
import d3sankey from 'd3-sankey'
import fs from 'fs'
//import { nodesSchema, linksSchema, metadataSchema } from './schema.js'
import svg2img from 'svg2img'
const { default: yahooFinance } = await import("yahoo-finance2");
const align =  'justify'
const nodesort =  undefined
const linksort = undefined
const nodePadding = 80
const nodeWidth = 50
const imageWidth = 1920
const imageHeight = 1080


const margin = ({ top: 140, right: 250, bottom: 30, left: 50 })
const width = imageWidth - margin.left - margin.right
const height = imageHeight - margin.top - margin.bottom


const color = {
    default: '#666666',
    profit: '#2ba02d',
    loss: '#cc0001'
}

const nodes = [
    {name: 'allRevenue', type: 'revenue', color: '#666666'},
    {name: 'totalRevenue', type: 'revenue', color: '#666666'},
    {name: 'costOfRevenue', type: 'loss', color: '#cc0001'},
    {name: 'grossProfit', type: 'profit', color: '#2ba02d'},
    {name: 'operatingIncome', type: 'revenue', color: '#666666'},
    {name: 'netIncome', type: 'profit', color: '#2ba02d'},
	{name: 'pretaxIncome', type: 'profit', color: '#2ba02d'},
    {name: 'otherIncomeExpense', type: 'loss', color: '#cc0001'},
	//{name: 'netInterestIncome', type: 'loss', color: '#cc0001'},
	{name: 'taxProvision', type: 'loss', color: '#cc0001'},
	{name: 'generalAndAdministrativeExpense', type: 'loss', color: '#cc0001'},
	{name: 'sellingAndMarketingExpense', type: 'loss', color: '#cc0001'},
	{name: 'researchAndDevelopment', type: 'loss', color: '#cc0001'},
	{name: 'depreciationAmortizationDepletionIncomeStatement', type: 'loss', color: '#cc0001'}
    ]




function assignValues(links, financials){
    links.forEach(link => {console.log(link.target + ':' + financials[link.target])})
    links.forEach(link => {link.value=((financials[link.target])<0?financials[link.target]*-1/1000000000:financials[link.target]/1000000000)})
    return;
}


async function getFinancialsData(symbol){
    const query = symbol
    const queryOptions = { period1: '2024-01-01', module: 'financials', type:'quarterly'};
    const result = await yahooFinance.fundamentalsTimeSeries(query, queryOptions);
    return result[result.length-1];
}
    

// helper functions
const formatValue = (value, currency, abbreviation) => {
    return format(',.2~f')(value) + abbreviation + currency
}

const findMaxValue = (objects, attribute) => Math.max(...objects.map(object => object[attribute]))

async function getXlsData (input, sheet, schema) {
    const { rows, errors } = await xlsx(input, { schema, sheet })
    if (errors.length > 0) throw new Error('Error loading Excel data!')
    return rows
}


//new function to create and save graph to disk
async function incomeSankey(symbol)
{
    var links =[
        {source: 'allRevenue', target: 'totalRevenue', value: -1,  color: '#666666'},
        {source: 'totalRevenue', target: 'grossProfit', value: -1,  color: '#2ba02d'},
        {source: 'totalRevenue', target: 'costOfRevenue', value: -1,  color: '#cc0001'},
        {source: 'grossProfit', target: 'operatingIncome', value: -1,  color: '#2ba02d'},
        {source: 'grossProfit', target: 'generalAndAdministrativeExpense', value: -1,  color: '#cc0001'},
        {source: 'grossProfit', target: 'sellingAndMarketingExpense', value: -1,  color: '#cc0001'},
        {source: 'grossProfit', target: 'researchAndDevelopment', value: -1,  color: '#cc0001'},
        {source: 'grossProfit', target: 'depreciationAmortizationDepletionIncomeStatement', value: -1,  color: '#cc0001'},
        {source: 'operatingIncome', target: 'pretaxIncome', value: -1,  color: '#2ba02d'},
        {source: 'operatingIncome', target: 'otherIncomeExpense', value: -1,  color: '#cc0001'},
        //{source: 'operatingIncome', target: 'netInterestIncome', value: -1,  color: '#cc0001'},
        {source: 'pretaxIncome', target: 'netIncome', value: -1,  color: '#2ba02d'},
        {source: 'pretaxIncome', target: 'taxProvision', value: -1,  color: '#cc0001'}
    ]

    const metadata = [{currency: '$', header: symbol, abbreviation: 'B'}];

    
    var financials = await getFinancialsData(symbol)
    assignValues(links, financials)

    
    var graph = {
        header: metadata[0]?.header ?? '',
        currency: metadata[0]?.currency ?? '€',
        abbreviation: metadata[0]?.abbreviation ?? 'B',
        nodes,
        links
    }
    // chart generation

    const { JSDOM } = jsdom

    const dom = new JSDOM('<!DOCTYPE html><body></body>')


    const body = select(dom.window.document.querySelector('body'))
    const svg = body
        .append('svg')
        .attr('width', imageWidth)
        .attr('height', imageHeight)
        .attr('xmlns', 'http://www.w3.org/2000/svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('background', '#fff')

    const mySankey = d3sankey.sankey()
        .nodeId(d => d.name)
        .nodeWidth(nodeWidth)
        .nodePadding(nodePadding)
        .nodeSort(nodesort)
        .linkSort(linksort)
        .nodeAlign(d3sankey[`sankey${align[0].toUpperCase()}${align.slice(1)}`])
        .extent([[margin.left, margin.top], [width - margin.right, height - margin.top]])

    mySankey(graph)

    const numLayers = findMaxValue(graph.nodes, 'layer')

    // links
    svg.append('g')
        .attr('fill', 'none')
        .attr('class', 'links')
        .attr('stroke-opacity', 0.5)
        .selectAll('path')
        .data(graph.links)
        .enter().append('path')
        .attr('d', d3sankey.sankeyLinkHorizontal())
        .attr('stroke-width', d => Math.max(1, d.width))
        .style('stroke', d => d.color || (d.target.type === 'profit' ? color.profit : d.target.type === 'loss' ? color.loss : color.default))
        .append('title')
        .text(d => d.index)
        .append('title')
        .text(d => `${d.source.name} → ${d.target.name}\n${d.value.toLocaleString()}`)

    // nodes
    svg.append('g')
        .attr('class', 'nodes')
        .selectAll('rect')
        .data(graph.nodes)
        .enter().append('rect')
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => d.y1 - d.y0)
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .style('fill', d => d.color || (d.type === 'profit' ? color.profit : d.type === 'loss' ? color.loss : color.default))

    // header
    svg.append('g')
        .append('text')
        .attr('x', d => width / 2)
        .attr('y', d => 70)
        .attr('font-family', 'Arial')
        .attr('font-size', '5em')
        .attr('text-length', '4em')
        .attr('font-weight', 'bold')
        .attr('text-anchor', 'middle')
        .attr('fill', d => 'blue')
        .text(graph.header)

    // node names and values
    svg.append('g')
        .attr('class', 'texts')
        .selectAll('text')
        .data(graph.nodes)
        .enter().append('text')
        .attr('x', d => d.layer < numLayers ? (d.x0 + d.x1) / 2 : d.x1 + 6)
        .attr('y', d => d.layer < numLayers ? d.y0 - nodePadding / 2 : (d.y1 + d.y0) / 2)
        .attr('font-family', 'Arial')
        .attr('font-size', nodePadding / 2.5)
        .attr('font-weight', 'bold')
        .attr('text-anchor', d => d.layer < numLayers ? 'middle' : 'start')
        .attr('fill', d => d.color || (d.type === 'profit' ? color.profit : d.type === 'loss' ? color.loss : color.default))
        .text(d => d.name)
        .append('tspan')
        .attr('fill-opacity', 0.7)
        .attr('x', d => d.layer < numLayers ? (d.x0 + d.x1) / 2 : d.x1 + 6)
        .attr('dy', '1em')
        .attr('font-weight', 'normal')
        .attr('font-size', '0.75em')
        .text(d => d.type === 'loss' ? ` (${formatValue(d.value, graph.currency, graph.abbreviation)})` : ` ${formatValue(d.value, graph.currency, graph.abbreviation)}`)

    const output = './images/' + (symbol + '.svg')
    const [filename, fileExtension] = output.split('.')

    // save the chart
    if (fileExtension === 'png') {
        svg2img(body.html(), function (_error, buffer) {
            fs.writeFileSync(`${filename}.png`, buffer)
        })
    } else if (fileExtension === undefined) {
        fs.writeFileSync(`/tmp/INCOME_${output}.svg`, body.html())
    } else {
        fs.writeFileSync(output, body.html())
    }
}

// Export functions for external use
export {incomeSankey};
  


